import React, { useState, useEffect } from "react";
import {
  Trophy,
  Gamepad2,
  BookOpen,
  Settings,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Coins,
  Compass,
  Sparkles,
  Layers
} from "lucide-react";
import { collection, onSnapshot, query, orderBy, doc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./lib/firebase";
import { Game, Bet, Setting, ParticipantScore } from "./types";
import {
  seedDatabaseIfNeeded,
  addBet,
  calculateRanking,
  getSettings,
  checkBetCompliance
} from "./lib/dbHelper";

// Importar componentes modulares
import Countdown from "./components/Countdown";
import PixPayment from "./components/PixPayment";
import Leaderboard from "./components/Leaderboard";
import AdminPanel from "./components/AdminPanel";
import BetsOverview from "./components/BetsOverview";
import SoccerBallLogo from "./components/SoccerBallLogo";
import { getTeamFlag } from "./lib/flags";

export default function App() {
  const [activeTab, setActiveTab] = useState<"betting" | "leaderboard" | "overview" | "rules" | "admin">("betting");

  // Dados em tempo real
  const [games, setGames] = useState<Game[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [pixSetting, setPixSetting] = useState<Setting>({
    pixKey: "61986267773",
    pixReceiver: "Glaucia Leles - Banco Itaú",
    adminPhone: "556186267773",
    logoUrl: "",
    headerColor: "#F4F4F4",
    headerTextColor: "#1e293b",
    backgroundColor: "#4E94D8",
  });
  const [ranking, setRanking] = useState<ParticipantScore[]>([]);

  // Carregamento
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState("");

  // Form de Palpite states
  const [selectedGameId, setSelectedGameId] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [predictionHome, setPredictionHome] = useState("0");
  const [predictionAway, setPredictionAway] = useState("0");
  const [firstGoalInput, setFirstGoalInput] = useState("");
  const [submittingBet, setSubmittingBet] = useState(false);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Palpite enviado com sucesso (para redirecionar para tela PIX)
  const [submittedBetInfo, setSubmittedBetInfo] = useState<{
    id: string;
    userName: string;
    userPhone: string;
    game: Game;
    homePrediction: number;
    awayPrediction: number;
    firstGoalPrediction: string;
  } | null>(null);

  // Inicializar Banco e Sincronizar dados em Tempo Real
  useEffect(() => {
    async function init() {
      try {
        await seedDatabaseIfNeeded();
      } catch (err) {
        console.error("Erro no seed do banco de dados na inicialização:", err);
      }
    }
    init();

    // Sincronizar Jogos
    const qGames = query(collection(db, "games"), orderBy("createdAt", "asc"));
    const unsubGames = onSnapshot(
      qGames,
      (snapshot) => {
        const gameList: Game[] = [];
        snapshot.forEach((docSnap) => {
          gameList.push({ ...docSnap.data(), id: docSnap.id } as Game);
        });
        setGames(gameList);
        
        // Autoselecionar primeiro jogo ativo aberto para palpites
        const openGame = gameList.find((g) => g.isActive);
        if (openGame) {
          setSelectedGameId(openGame.id);
        } else if (gameList.length > 0) {
          setSelectedGameId(gameList[0].id);
        }
        setLoading(false);
      },
      (error) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        setErrorStatus(`Erro ao carregar partidas: ${errMsg}`);
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, "games");
      }
    );

    // Sincronizar Palpites
    const qBets = query(collection(db, "bets"), orderBy("createdAt", "desc"));
    const unsubBets = onSnapshot(
      qBets,
      (snapshot) => {
        const betList: Bet[] = [];
        snapshot.forEach((docSnap) => {
          betList.push({ ...docSnap.data(), id: docSnap.id } as Bet);
        });
        setBets(betList);
      },
      (error) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        setErrorStatus(`Erro ao carregar palpites: ${errMsg}`);
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, "bets");
      }
    );

    // Sincronizar Configurações PIX
    const unsubSettings = onSnapshot(
      doc(db, "settings", "pix"),
      (docSnap) => {
        if (docSnap.exists()) {
          setPixSetting(docSnap.data() as Setting);
        }
      },
      (error) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        setErrorStatus(`Erro ao carregar configurações PIX: ${errMsg}`);
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, "settings/pix");
      }
    );

    return () => {
      unsubGames();
      unsubBets();
      unsubSettings();
    };
  }, []);

  // Recalcular Ranking toda vez que a base de candidaturas/palpites sincronizar
  useEffect(() => {
    async function updateRanking() {
      const items = await calculateRanking(bets);
      setRanking(items);
    }
    updateRanking();
  }, [bets]);

  // Seletor do próximo jogo mais próximo para contagem regressiva
  // Seleciona o jogo ativo que ainda possua data futura ou simplesmente o primeiro ativo
  const getNextGameCountdown = (): { game: Game; label: string } | null => {
    const activeGames = games.filter((g) => g.isActive);
    if (activeGames.length === 0) return null;

    // Encontrar o mais próximo de começar (com base no gameTimestamp)
    const futureGames = activeGames.filter((g) => g.gameTimestamp > Date.now());
    const target = futureGames.length > 0 ? futureGames[0] : activeGames[0];

    return {
      game: target,
      label: `${target.homeTeam} x ${target.awayTeam}`,
    };
  };

  const nextGameData = getNextGameCountdown();

  // Enviar palpite do usuário para a base
  const handleSubmitBet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    if (!nameInput.trim()) {
      setFormValidationError("Nome Completo é um campo obrigatório!");
      return;
    }
    if (!phoneInput.trim()) {
      setFormValidationError("WhatsApp é um campo obrigatório!");
      return;
    }
    if (!selectedGameId) {
      setFormValidationError("Selecione um dos jogos disponíveis!");
      return;
    }
    if (!firstGoalInput) {
      setFormValidationError("Selecione quem fará o primeiro gol (ou marque Ninguém)!");
      return;
    }

    const selectedGame = games.find((g) => g.id === selectedGameId);
    if (!selectedGame) {
      setFormValidationError("Partida inválida selecionada.");
      return;
    }

    setSubmittingBet(true);

    const cleanPhone = phoneInput.trim().replace(/\D/g, "");

    try {
      // Checar se já existe palpite confirmado para o telefone neste jogo
      const complianceCheck = await checkBetCompliance(
        cleanPhone,
        selectedGameId,
        null, // txId
        null, // receiptHash
        ""    // betId
      );

      if (!complianceCheck.compliant) {
        setFormValidationError(complianceCheck.reason || "Não foi possível enviar o palpite.");
        setSubmittingBet(false);
        return;
      }

      const betPayload = {
        userName: nameInput.trim(),
        userPhone: cleanPhone,
        gameId: selectedGameId,
        homePrediction: parseInt(predictionHome) || 0,
        awayPrediction: parseInt(predictionAway) || 0,
        firstGoalPrediction: firstGoalInput,
      };

      const betId = await addBet(betPayload);
      if (betId) {
        setSubmittedBetInfo({
          id: betId,
          userName: betPayload.userName,
          userPhone: betPayload.userPhone,
          game: selectedGame,
          homePrediction: betPayload.homePrediction,
          awayPrediction: betPayload.awayPrediction,
          firstGoalPrediction: betPayload.firstGoalPrediction,
        });

        // Limpar inputs de previsão apenas, manter nome e telefone para agilizar futuros palpites
        setPredictionHome("0");
        setPredictionAway("0");
        setFirstGoalInput("");
      } else {
        setFormValidationError("Falha de conexão ao enviar palpite. Tente novamente.");
      }
    } catch (e) {
      setFormValidationError("Erro ao salvar palpite no banco de dados. " + String(e));
    } finally {
      setSubmittingBet(false);
    }
  };

  const getSelectedGameObj = () => {
    return games.find((g) => g.id === selectedGameId);
  };

  const isCssColor = (val?: string) => {
    if (!val) return false;
    const clean = val.trim();
    return clean.startsWith("#") || clean.startsWith("rgb") || clean.startsWith("hsl") || clean.startsWith("linear-gradient") || clean.startsWith("gradient");
  };

  const bgStyle = isCssColor(pixSetting.backgroundColor) ? { backgroundColor: pixSetting.backgroundColor } : undefined;
  const bgClass = isCssColor(pixSetting.backgroundColor) ? "" : (pixSetting.backgroundColor || "bg-[#4E94D8]");

  const headerStyle = isCssColor(pixSetting.headerColor) ? { backgroundColor: pixSetting.headerColor } : undefined;
  const headerClass = isCssColor(pixSetting.headerColor) ? "" : (pixSetting.headerColor || "bg-[#F4F4F4]/95");

  const headerTextStyle = isCssColor(pixSetting.headerTextColor) ? { color: pixSetting.headerTextColor } : undefined;
  const headerTextClass = isCssColor(pixSetting.headerTextColor) ? "" : (pixSetting.headerTextColor || "text-slate-800");

  const headerSubtextStyle = isCssColor(pixSetting.headerTextColor) ? { color: pixSetting.headerTextColor, opacity: 0.75 } : undefined;
  const headerSubtextClass = isCssColor(pixSetting.headerTextColor) ? "" : "text-zinc-600";

  const renderLogo = () => {
    if (!pixSetting.logoUrl) {
      return (
        <svg viewBox="0 0 120 80" className="w-12 h-8 filter drop-shadow-[0_2px_8px_rgba(78,148,216,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="5,15 60,3 115,15 115,65 60,77 5,65" fill={isCssColor(pixSetting.backgroundColor) ? pixSetting.backgroundColor : "#4E94D8"} />
          <text
            x="58"
            y="50"
            fill="white"
            fontSize="34"
            fontWeight="900"
            fontStyle="italic"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            style={{ letterSpacing: "-1.5px" }}
          >
            WL
          </text>
        </svg>
      );
    }

    const trimmed = pixSetting.logoUrl.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/") || trimmed.startsWith("data:image")) {
      return (
        <img
          src={trimmed}
          alt="Logo do Bolão"
          className="w-10 h-10 object-contain rounded-xl shadow-md border border-white/10"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Caso seja um emoji ou texto curto
    return (
      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-2xl font-extrabold shadow-sm border border-white/5">
        {trimmed}
      </div>
    );
  };

  const selectedGameObj = getSelectedGameObj();

  return (
    <div
      className={`min-h-screen text-gray-100 flex flex-col justify-between selection:bg-blue-500 selection:text-slate-950 font-sans leading-relaxed transition-colors duration-300 ${bgClass}`}
      style={bgStyle}
    >
      {/* Visual background glow decoratives */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none overflow-hidden -z-10 bg-radial from-blue-500/10 via-blue-800/2 to-transparent" />

      {/* Main Container Header */}
      <header
        className={`border-b border-zinc-200/20 backdrop-blur-md sticky top-0 z-30 shadow-sm transition-colors duration-300 ${headerClass}`}
        style={headerStyle}
      >
        <div className="w-full max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {renderLogo()}
            <div>
              <h1
                className={`text-base font-black tracking-wider uppercase leading-none ${headerTextClass}`}
                style={headerTextStyle}
              >
                BOLÃO WL
              </h1>
              <p
                className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${headerSubtextClass}`}
                style={headerSubtextStyle}
              >
                Bolão Esportivo Copa 2026
              </p>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-1 bg-zinc-200/60 p-1 rounded-xl border border-zinc-300/40">
            {[
              { id: "betting", label: "Palpitar", icon: Gamepad2 },
              { id: "leaderboard", label: "Ranking", icon: Trophy },
              { id: "overview", label: "Palpites", icon: Layers },
              { id: "rules", label: "Regras", icon: BookOpen },
              { id: "admin", label: "Painel", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === "betting") {
                      // Se voltou para palpitar, esvazia palpite enviado com sucesso
                      setSubmittedBetInfo(null);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white font-black shadow-md shadow-blue-500/10"
                      : "text-zinc-600 hover:text-slate-900 hover:bg-zinc-200/80"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="flex-grow w-full max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-gray-400 font-medium tracking-wide">
              Carregando dados BOLÃO WL...
            </p>
          </div>
        ) : errorStatus ? (
          <div className="flex gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {errorStatus}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/********************* VIEW: PALPITAR *********************/}
            {activeTab === "betting" && (
              <>
                {submittedBetInfo ? (
                  <PixPayment
                    betId={submittedBetInfo.id}
                    userName={submittedBetInfo.userName}
                    userPhone={submittedBetInfo.userPhone}
                    game={submittedBetInfo.game}
                    homePrediction={submittedBetInfo.homePrediction}
                    awayPrediction={submittedBetInfo.awayPrediction}
                    firstGoalPrediction={submittedBetInfo.firstGoalPrediction}
                    pixKey={pixSetting.pixKey}
                    pixReceiver={pixSetting.pixReceiver}
                    adminPhone={pixSetting.adminPhone || "556186267773"}
                    entryFee={pixSetting.entryFee}
                    pixCopiaCola={pixSetting.pixCopiaCola}
                    qrCodeUrl={pixSetting.qrCodeUrl}
                    onReset={() => setSubmittedBetInfo(null)}
                  />
                ) : (
                  <div className="space-y-5 animate-fade-in">
                    {/* Countdown Banner */}
                    {nextGameData && (
                      <Countdown
                        targetTimestamp={nextGameData.game.gameTimestamp}
                        gameLabel={nextGameData.label}
                        game={nextGameData.game}
                      />
                    )}

                    {/* Entry value banner card */}
                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-400/20 border border-yellow-400/30 rounded-xl flex items-center justify-center shadow-inner">
                          <Coins className="w-5 h-5 text-yellow-500 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-black">Valor da Inscrição</p>
                          <p className="text-lg font-black text-white leading-tight font-mono">R$ {(pixSetting.entryFee ?? 10).toFixed(2).replace(".", ",")} <span className="text-xs font-semibold text-zinc-400">por palpite</span></p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full px-3 py-1 font-black uppercase tracking-wider shadow-sm">
                        Pagamento PIX
                      </span>
                    </div>

                    {/* Form Betting Card */}
                    <div id="palpite-form" className="bg-[#111111] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 scroll-mt-20">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          ENVIE SEU PALPITE ONLINE
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium">Preencha os campos abaixo e confirme seu placar</p>
                      </div>

                      <form onSubmit={handleSubmitBet} className="space-y-4 text-xs text-slate-300">
                        {/* Passo 1: Placar do palpite */}
                        {selectedGameObj && (
                          <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5 animate-fade-in">
                             <p className="text-[10px] font-black text-zinc-100 uppercase tracking-widest flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                               1. INFORME SEU PLACAR
                             </p>

                             <div className="flex items-center justify-center gap-4 sm:gap-7 py-3">
                               {/* Mandante */}
                               <div className="flex flex-col items-center text-center w-28">
                                 <div className="text-2xl mb-1 select-none">{getTeamFlag(selectedGameObj.homeTeam)}</div>
                                 <p className="text-white font-black text-xs uppercase mb-2 truncate max-w-full">{selectedGameObj.homeTeam}</p>
                                 
                                 <div className="flex items-center bg-slate-950 border border-white/10 rounded-full p-1 shadow-inner">
                                   <button
                                     type="button"
                                     onClick={() => {
                                       const val = parseInt(predictionHome) || 0;
                                       if (val > 0) setPredictionHome(String(val - 1));
                                     }}
                                     className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-base flex items-center justify-center transition-all cursor-pointer select-none active:scale-90"
                                   >
                                     -
                                   </button>
                                   <span className="w-8 text-center text-white font-black text-sm font-mono select-none">
                                     {predictionHome}
                                   </span>
                                   <button
                                     type="button"
                                     onClick={() => {
                                       const val = parseInt(predictionHome) || 0;
                                       setPredictionHome(String(val + 1));
                                     }}
                                     className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-base flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 shadow-lg shadow-blue-500/10"
                                   >
                                     +
                                   </button>
                                 </div>
                               </div>

                               <span className="text-sm font-black text-yellow-400 select-none bg-yellow-500/10 border border-yellow-500/20 rounded-full w-7 h-7 flex items-center justify-center mt-6">X</span>

                               {/* Visitante */}
                               <div className="flex flex-col items-center text-center w-28">
                                 <div className="text-2xl mb-1 select-none">{getTeamFlag(selectedGameObj.awayTeam)}</div>
                                 <p className="text-white font-black text-xs uppercase mb-2 truncate max-w-full">{selectedGameObj.awayTeam}</p>
                                 
                                 <div className="flex items-center bg-slate-950 border border-white/10 rounded-full p-1 shadow-inner">
                                   <button
                                     type="button"
                                     onClick={() => {
                                       const val = parseInt(predictionAway) || 0;
                                       if (val > 0) setPredictionAway(String(val - 1));
                                     }}
                                     className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-base flex items-center justify-center transition-all cursor-pointer select-none active:scale-90"
                                   >
                                     -
                                   </button>
                                   <span className="w-8 text-center text-white font-black text-sm font-mono select-none">
                                     {predictionAway}
                                   </span>
                                   <button
                                     type="button"
                                     onClick={() => {
                                       const val = parseInt(predictionAway) || 0;
                                       setPredictionAway(String(val + 1));
                                     }}
                                     className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-base flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 shadow-lg shadow-red-500/10"
                                   >
                                     +
                                   </button>
                                 </div>
                               </div>
                             </div>

                             {/* Escolha 1º gol */}
                             <div className="border-t border-white/5 pt-3.5 space-y-2">
                               <label className="block text-[10px] font-extrabold text-zinc-100 uppercase tracking-widest mb-1.5 leading-normal">
                                 2. QUAL O TIME QUE FARÁ O PRIMEIRO GOL DA PARTIDA? (+3 pts extras)
                               </label>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { name: selectedGameObj.homeTeam, flag: getTeamFlag(selectedGameObj.homeTeam) },
                                  { name: selectedGameObj.awayTeam, flag: getTeamFlag(selectedGameObj.awayTeam) },
                                  { name: "Ninguém", flag: "❌" },
                                ].map((option) => (
                                  <button
                                    key={option.name}
                                    type="button"
                                    onClick={() => setFirstGoalInput(option.name)}
                                    className={`py-2.5 px-1 text-[11px] font-bold rounded-xl text-center border cursor-pointer active:scale-95 transition-all truncate flex flex-col items-center justify-center gap-1 ${
                                      firstGoalInput === option.name
                                        ? "bg-blue-600 text-white border-blue-400 font-black"
                                        : "bg-slate-950 text-gray-300 border-white/10 hover:border-white/20"
                                    }`}
                                  >
                                    <span className="text-sm select-none">{option.flag}</span>
                                    <span className="truncate max-w-full font-bold">{option.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Passo 3: Informações de Cadastro ao final */}
                        <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5 animate-fade-in">
                          <p className="text-[10px] font-black text-zinc-100 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                            3. SEUS DADOS PARA CONTATO
                          </p>
                          <div className="space-y-3.5">
                            <div>
                              <label className="block text-[10px] font-extrabold text-zinc-100 uppercase tracking-wider mb-1">Nome Completo</label>
                              <input
                                type="text"
                                required
                                value={nameInput}
                                onChange={(e) => {
                                  const rawVal = e.target.value;
                                  setNameInput(rawVal);
                                }}
                                placeholder="Digite seu nome"
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium placeholder:text-gray-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-zinc-100 uppercase tracking-wider mb-1">WhatsApp</label>
                              <input
                                type="tel"
                                required
                                value={phoneInput}
                                onChange={(e) => {
                                  const rawVal = e.target.value;
                                  // Keep only digits
                                  let digits = rawVal.replace(/\D/g, "");
                                  if (digits.length > 11) {
                                    digits = digits.slice(0, 11);
                                  }
                                  
                                  let formatted = "";
                                  if (digits.length > 0) {
                                    formatted = `(${digits.slice(0, 2)}`;
                                  }
                                  if (digits.length > 2) {
                                    formatted += `) ${digits.slice(2, 7)}`;
                                  }
                                  if (digits.length > 7) {
                                    formatted += `-${digits.slice(7)}`;
                                  }
                                  
                                  // Adjust hyphen if it's a 10-digit landline format
                                  if (digits.length === 10) {
                                    formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                                  }
                                  
                                  setPhoneInput(formatted);
                                }}
                                placeholder="(00) 00000-0000"
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono placeholder:text-gray-600"
                              />
                            </div>
                          </div>
                        </div>

                        {formValidationError && (
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-left space-y-1 text-xs font-semibold select-none animate-fade-in flex gap-2.5 items-start mt-2">
                            <span className="text-rose-500 shrink-0 mt-0.5">⚠️</span>
                            <div>
                              <p className="font-extrabold text-[11px] tracking-wide uppercase">Falha na Validação</p>
                              <p className="text-[10px] font-medium leading-relaxed mt-0.5 text-rose-300">
                                {formValidationError}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Botão de Envio */}
                        <button
                          type="submit"
                          disabled={submittingBet || !selectedGameId}
                          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-50 transition w-full text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm tracking-wide uppercase cursor-pointer shadow-lg shadow-blue-500/5 mt-2"
                        >
                          {submittingBet ? "Enviando palpite para o Bolão..." : "Confirmar & Salvar Palpite • Avançar PIX"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}

            {/********************* VIEW: LEADERBOARD *********************/}
            {activeTab === "leaderboard" && (
              <div className="animate-fade-in">
                <Leaderboard bets={bets} games={games} />
              </div>
            )}

            {/********************* VIEW: OVERVIEW DOS PALPITES *********************/}
            {activeTab === "overview" && (
              <div className="animate-fade-in">
                <BetsOverview bets={bets} games={games} entryFee={pixSetting.entryFee} />
              </div>
            )}

            {/********************* VIEW: REGRAS DO BOLÃO *********************/}
            {activeTab === "rules" && (
              <div className="bg-[#111111] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-fade-in text-xs text-zinc-100">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Compass className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-extrabold text-white">REGRAS DO BOLÃO • COPA 2026</h3>
                </div>

                <div className="space-y-4">
                  {/* Pontuações */}
                  <div className="space-y-2 bg-black/20 p-3.5 rounded-2xl border border-white/5">
                    <h4 className="font-extrabold text-blue-400 text-xs">SISTEMA DE PONTUAÇÃO</h4>
                    <p className="text-[11px] text-zinc-200">As pontuações são únicas (não cumulativas no placar fundamental, conta o maior lance):</p>
                    <ul className="space-y-2.5 pl-1.5 mt-2.5">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full font-bold flex items-center justify-center text-[10px]">10</span>
                        <div>
                          <p className="font-extrabold text-white">Placar Exato (PE)</p>
                          <p className="text-[10px] text-zinc-300 font-medium leading-normal">Acertou exatamente o resultado exato na régua (ex: jogou 2-1, final 2-1).</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-yellow-500 text-slate-950 rounded-full font-bold flex items-center justify-center text-[10px]">07</span>
                        <div>
                          <p className="font-extrabold text-white">Vencedor + Saldo de Gols</p>
                          <p className="text-[10px] text-zinc-300 font-medium leading-normal">Acertou quem ganhou a partida e a diferença exata de gols (ex: palpito 2-0, terminou 3-1).</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-amber-600 text-slate-950 rounded-full font-bold flex items-center justify-center text-[10px]">05</span>
                        <div>
                          <p className="font-extrabold text-white">Vencedor / Empate Simples</p>
                          <p className="text-[10px] text-zinc-300 font-medium leading-normal">Acertou somente quem faturou a vitória ou se empatou de forma simples (ex: jogou 1-0 m, terminou 3-0).</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2 border-t border-white/5 pt-2 mt-2 leading-none">
                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full font-bold flex items-center justify-center text-[10px]">+3</span>
                        <div className="pt-0.5">
                          <p className="font-extrabold text-indigo-300">Bônus de Primeiro Goalscorer</p>
                          <p className="text-[10px] text-zinc-300 font-medium leading-normal">Soma 3 pontos secos adicionais se você acertar o time ou seleção que inaugurar o primeiro gol.</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Como Participar */}
                  <div className="space-y-1 bg-black/20 p-3.5 rounded-2xl border border-white/5 text-zinc-200">
                    <h4 className="font-extrabold text-blue-400 text-xs mb-1.5">COMO VALIDAR SUA PARTICIPAÇÃO</h4>
                    <p className="text-[11px] leading-relaxed">
                      1. Registre seu palpite na aba <span className="text-blue-400 font-extrabold">Palpitar</span>.<br />
                      2. Copie a chave PIX ou escaneie o QR Code estático exibido no valor de <span className="text-yellow-400 font-extrabold font-mono">R$ {(pixSetting.entryFee ?? 10).toFixed(2).replace(".", ",")}</span> por palpite. Cada participante poderá ter até 2 palpites cadastrados por jogo (seja ele com o PIX confirmado ou aguardando confirmação).<br />
                      3. Efetue o pagamento em seu banco.<br />
                      4. Clique em <span className="text-blue-400 font-extrabold">"Enviar Comprovante no WhatsApp"</span> para abrir o chat pré-preenchido e encaminhe o recibo ao administrador.<br />
                      5. Assim que o administrador validar, seu palpite mudará para <span className="text-blue-400 font-extrabold">Confirmado</span> e começará a somar pontos no Ranking Geral!
                    </p>
                  </div>

                  {/* Informações Importantes / Descontração */}
                  <div className="space-y-2 bg-yellow-500/10 p-3.5 rounded-2xl border border-yellow-500/20 text-yellow-150">
                    <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-yellow-300">
                      <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce"></span>
                      INFORMAÇÕES IMPORTANTES
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-zinc-200 font-semibold">
                      <li>Esta atividade é exclusivamente uma <span className="text-white font-extrabold">atividade de descontração e entretenimento</span> para a comunidade WL.</li>
                      <li>O <span className="text-white font-extrabold">horário limite</span> para registro de palpites e envio de comprovantes se encerra rigorosamente no <span className="text-white font-extrabold">horário de início de cada jogo</span>.</li>
                      <li>Cada participante poderá ter <span className="text-white font-extrabold">até 2 palpites cadastrados por jogo</span>, esteja ele com o PIX confirmado ou ainda pendente / aguardando confirmação.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/********************* VIEW: ADMIN CONTROL *********************/}
            {activeTab === "admin" && (
              <div className="animate-fade-in">
                <AdminPanel
                  games={games}
                  bets={bets}
                  currentPixSetting={pixSetting}
                  onRefreshData={async () => {
                    // Sem necessidade de recarregar manual devido aos Listeners Real-time ativos, porém mantido para fallback
                  }}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 bg-[#F4F4F4] py-6 text-center text-[10px] text-slate-700 font-medium font-sans shadow-inner">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 120 80" className="w-8 h-5 filter opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="5,15 60,3 115,15 115,65 60,77 5,65" fill="#4E94D8" />
              <text
                x="58"
                y="50"
                fill="white"
                fontSize="34"
                fontWeight="900"
                fontStyle="italic"
                fontFamily="system-ui, -apple-system, sans-serif"
                textAnchor="middle"
                style={{ letterSpacing: "-1.5px" }}
              >
                WL
              </text>
            </svg>
            <p className="text-[10px] text-slate-700">© 2026 BOLÃO WL. Todos os direitos reservados.</p>
          </div>
          <p className="text-[9px] text-zinc-600">
            Organização autorizada • Jogue com responsabilidade • Taxa de R$ {(pixSetting.entryFee ?? 10).toFixed(2).replace(".", ",")} por Palpite
          </p>
        </div>
      </footer>
    </div>
  );
}
