import React, { useState, useEffect } from "react";
import {
  Lock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Database,
  Calendar,
  Layers,
  Settings,
  Users,
  AlertCircle,
  QrCode,
  DollarSign,
  Search,
  Check,
  X
} from "lucide-react";
import { Game, Bet, Setting } from "../types";
import { getTeamFlag } from "../lib/flags";
import {
  addGame,
  updateGame,
  deleteGame,
  updateBet,
  deleteBet,
  getSettings,
  saveSettings,
  recomputePointsForGame
} from "../lib/dbHelper";

interface AdminPanelProps {
  games: Game[];
  bets: Bet[];
  currentPixSetting: Setting;
  onRefreshData: () => void;
}

export default function AdminPanel({
  games,
  bets,
  currentPixSetting,
  onRefreshData,
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "games" | "bets" | "settings">("dashboard");

  // Admin states
  const [pixKey, setPixKey] = useState(currentPixSetting.pixKey);
  const [pixReceiver, setPixReceiver] = useState(currentPixSetting.pixReceiver);
  const [adminPhone, setAdminPhone] = useState(currentPixSetting.adminPhone || "556186267773");
  const [settingsSuccess, setSettingsSuccess] = useState("");

  // Game Form states
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [gHomeTeam, setGHomeTeam] = useState("");
  const [gAwayTeam, setGAwayTeam] = useState("");
  const [gDate, setGDate] = useState("");
  const [gTime, setGTime] = useState("");
  const [gLocation, setGLocation] = useState("");
  const [gTimestampStr, setGTimestampStr] = useState("");
  const [gIsActive, setGIsActive] = useState(true);

  // Score Entry state
  const [scoreFormGameId, setScoreFormGameId] = useState<string | null>(null);
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [scoreFirstGoal, setScoreFirstGoal] = useState(""); // Team name or "Ninguém"

  // Bet filters
  const [betSearch, setBetSearch] = useState("");
  const [betStatusFilter, setBetStatusFilter] = useState<"all" | "pending" | "confirmed">("all");

  // Deletion States
  const [betToDelete, setBetToDelete] = useState<Bet | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  useEffect(() => {
    // Sincronizar form pix
    setPixKey(currentPixSetting.pixKey);
    setPixReceiver(currentPixSetting.pixReceiver);
    setAdminPhone(currentPixSetting.adminPhone || "556186267773");
  }, [currentPixSetting]);

  // Verificar autenticação localmente conforme o login/senha requisitado "wlcop2026"
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "wlcop2026") {
      setIsAuthenticated(true);
      setAuthError("");
      // Guardar sessão temporária
      localStorage.setItem("admin_token", "wlcop2026_valid");
    } else {
      setAuthError("Senha incorreta! Tente novamente.");
    }
  };

  useEffect(() => {
    // Restaurar sessão rápida do administrador
    const stored = localStorage.getItem("admin_token");
    if (stored === "wlcop2026_valid") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_token");
  };

  // Submissão do Jogo
  const handleGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gHomeTeam || !gAwayTeam || !gDate || !gTime || !gLocation) {
      alert("Preencha todos os campos obrigatórios do jogo!");
      return;
    }

    // Tentar converter data em timestamp para conatgem regressiva funcional
    let calculatedTimestamp = Date.now();
    if (gTimestampStr) {
      calculatedTimestamp = new Date(gTimestampStr).getTime();
    } else {
      // Tentar adivinhar
      calculatedTimestamp = new Date(`2026-06-19T${gTime}:00`).getTime();
    }

    const gamePayload = {
      homeTeam: gHomeTeam,
      awayTeam: gAwayTeam,
      date: gDate,
      time: gTime,
      location: gLocation,
      gameTimestamp: calculatedTimestamp,
      isActive: gIsActive,
    };

    try {
      if (editingGameId) {
        await updateGame(editingGameId, gamePayload);
      } else {
        await addGame(gamePayload);
      }

      setGameFormOpen(false);
      resetGameForm();
      onRefreshData();
    } catch (e) {
      alert("Erro ao salvar jogo no Firestore.");
    }
  };

  const resetGameForm = () => {
    setEditingGameId(null);
    setGHomeTeam("");
    setGAwayTeam("");
    setGDate("");
    setGTime("");
    setGLocation("");
    setGTimestampStr("");
    setGIsActive(true);
  };

  const startEditGame = (game: Game) => {
    setEditingGameId(game.id);
    setGHomeTeam(game.homeTeam);
    setGAwayTeam(game.awayTeam);
    setGDate(game.date);
    setGTime(game.time);
    setGLocation(game.location);
    // Converter timestamp em formato de datetime-local aceitável no HTML input
    const dateObj = new Date(game.gameTimestamp);
    // Formato yyyy-MM-ddThh:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    const localStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(
      dateObj.getHours()
    )}:${pad(dateObj.getMinutes())}`;
    setGTimestampStr(localStr);
    setGIsActive(game.isActive);
    setGameFormOpen(true);
  };

  const handleDeleteGame = (game: Game) => {
    setGameToDelete(game);
  };

  const handleConfirmDeleteGame = async () => {
    if (!gameToDelete?.id) return;
    try {
      await deleteGame(gameToDelete.id);
      onRefreshData();
    } catch (err) {
      alert("Erro ao excluir partida: " + String(err));
    } finally {
      setGameToDelete(null);
    }
  };

  // Lógica para salvar resultados finais e acionar o recálculo dos pontos
  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreFormGameId) return;

    const game = games.find((g) => g.id === scoreFormGameId);
    if (!game) return;

    const hScore = scoreHome === "" ? null : parseInt(scoreHome);
    const aScore = scoreAway === "" ? null : parseInt(scoreAway);

    const updatedGame: Game = {
      ...game,
      homeScore: hScore,
      awayScore: aScore,
      firstGoalScorer: scoreFirstGoal || null,
    };

    try {
      // 1. Atualizar placar do jogo
      await updateGame(scoreFormGameId, {
        homeScore: hScore,
        awayScore: aScore,
        firstGoalScorer: scoreFirstGoal || null,
      });

      // 2. Se houver placares informados, calcular pontuação das apostas associadas automaticamente
      if (hScore !== null && aScore !== null) {
        await recomputePointsForGame(updatedGame);
      }

      setScoreFormGameId(null);
      setScoreHome("");
      setScoreAway("");
      setScoreFirstGoal("");
      onRefreshData();
      alert("Placar salvo e pontuações calculadas automaticamente com sucesso!");
    } catch (err) {
      alert("Erro ao salvar placares.");
    }
  };

  // Alterar Status de Pagamento (Confirmar PIX)
  const handleConfirmPayment = async (bet: Bet, confirmStatus: boolean) => {
    try {
      const newStatus = confirmStatus ? "confirmed" : "pending";
      
      // Se estamos confirmando, e este jogo correspondente já possui um resultado inserido, podemos calcular os pontos dele agora
      let calPoints = bet.calculatedPoints;
      const gameRef = games.find((g) => g.id === bet.gameId);
      if (confirmStatus && gameRef && gameRef.homeScore !== null && gameRef.homeScore !== undefined) {
        const { calculatePointsForBet } = await import("../lib/dbHelper");
        calPoints = calculatePointsForBet(
          bet.homePrediction,
          bet.awayPrediction,
          bet.firstGoalPrediction,
          gameRef.homeScore!,
          gameRef.awayScore!,
          gameRef.firstGoalScorer || "Ninguém"
        );
      } else if (!confirmStatus) {
        calPoints = null; // Se desconfirma, zera pontos por segurança
      }

      await updateBet(bet.id, {
        status: newStatus,
        calculatedPoints: calPoints,
      });
      onRefreshData();
    } catch (err) {
      alert("Erro de atualização da aposta.");
    }
  };

  const handleDeleteBet = (bet: Bet) => {
    setBetToDelete(bet);
  };

  const handleConfirmDeleteBet = async () => {
    if (!betToDelete?.id) return;
    try {
      await deleteBet(betToDelete.id);
      onRefreshData();
    } catch (err) {
      alert("Erro ao excluir palpite: " + String(err));
    } finally {
      setBetToDelete(null);
    }
  };

  // Salvar PIX Config
  const handleSavePixSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixKey || !pixReceiver) {
      alert("Chave e favorecido são obrigatórios!");
      return;
    }
    await saveSettings({ pixKey, pixReceiver, adminPhone });
    onRefreshData();
    setSettingsSuccess("Configurações atualizadas com sucesso!");
    setTimeout(() => setSettingsSuccess(""), 4000);
  };

  // Estatísticas Rápidas do Painel
  const totalBetsCount = bets.length;
  const confirmedBets = bets.filter((b) => b.status === "confirmed");
  const pendingBets = bets.filter((b) => b.status === "pending");
  const totalCashCollected = confirmedBets.length * 10;
  const uniqueParticipants = new Set(bets.map((b) => b.userPhone)).size;

  // Filtrar Palpites cadastrados na listagem
  const filteredBets = bets.filter((b) => {
    const game = games.find((g) => g.id === b.gameId);
    const gameText = game ? `${game.homeTeam} x ${game.awayTeam}`.toLowerCase() : "";
    
    const matchesSearch =
      b.userName.toLowerCase().includes(betSearch.toLowerCase()) ||
      b.userPhone.includes(betSearch) ||
      gameText.includes(betSearch.toLowerCase());

    const matchesStatus =
      betStatusFilter === "all" || b.status === betStatusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-[#111] border border-white/10 max-w-sm mx-auto rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-blue-500/10 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Painel Administrativo</h3>
          <p className="text-[10px] text-white/40 font-medium">Insira a chave de acesso para entrar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
              Senha de Acesso
            </label>
            <input
              type="password"
              placeholder="Digite wlcop2026..."
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {authError && (
            <div className="flex items-center gap-1.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wide">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {authError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] uppercase tracking-widest text-xs cursor-pointer"
          >
            Acessar Sistema
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              BOLÃO WL • Painel de Controle
            </h3>
          </div>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">
            Chave ativa • Logado como Gestor Geral
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-[#050505] hover:bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition shrink-0 active:scale-95 cursor-pointer"
        >
          Sair Painel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#050505] p-1 rounded-2xl border border-white/10 text-[10px] uppercase tracking-wider font-bold overflow-x-auto">
        {[
          { tab: "dashboard", label: "Dashboard", icon: Layers },
          { tab: "games", label: "Partidas", icon: Calendar },
          { tab: "bets", label: "Palpites", icon: Users },
          { tab: "settings", label: "Dados PIX", icon: Settings },
        ].map((btn) => {
          const Icon = btn.icon;
          const isActive = activeTab === btn.tab;
          return (
            <button
              key={btn.tab}
              onClick={() => setActiveTab(btn.tab as any)}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl transition shrink-0 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white font-black"
                  : "text-white/40 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {btn.label}
            </button>
          );
        })}
      </div>

      {/********* TAB: DASHBOARD *********/}
      {activeTab === "dashboard" && (
        <div className="space-y-4 animate-fade-in">
          {/* Bento-grid Analytics cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 shadow-md flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">Total Palpites</span>
              <p className="text-2xl font-black font-mono text-white mt-1.5">{totalBetsCount}</p>
            </div>
            <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 shadow-md flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-blue-500 tracking-widest">Arrecadado PIX</span>
              <p className="text-2xl font-black font-mono text-blue-500 mt-1.5 font-bold">
                R$ {totalCashCollected.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 shadow-md flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-yellow-500 tracking-widest">Confirmados (Ativos)</span>
              <p className="text-2xl font-black font-mono text-yellow-500 mt-1.5 font-bold">{confirmedBets.length}</p>
            </div>
            <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 shadow-md flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">Aguardando PIX</span>
              <p className="text-2xl font-black font-mono text-white/50 mt-1.5">{pendingBets.length}</p>
            </div>
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider">Resumo da Competição</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-white/55">
              <div>
                <p>Torcedores Participando: <span className="text-white font-bold font-mono">{uniqueParticipants}</span></p>
                <p className="mt-1">Partidas Configuradas: <span className="text-white font-bold font-mono">{games.length}</span></p>
              </div>
              <div>
                <p>Média de palpites por jogo: <span className="text-white font-bold font-mono">
                  {games.length > 0 ? (totalBetsCount / games.length).toFixed(1) : 0}
                </span></p>
                <p className="mt-1">Inscrições pendentes: <span className="text-white font-bold font-mono">{pendingBets.length} (R$ {pendingBets.length * 10},00)</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/********* TAB: PARTIDAS *********/}
      {activeTab === "games" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center bg-[#050505] p-3 rounded-2xl border border-white/10">
            <span className="text-xs font-bold text-white/60 tracking-wider uppercase">Gerenciar Partidas ({games.length})</span>
            <button
              onClick={() => {
                resetGameForm();
                setGameFormOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Adicionar Jogo
            </button>
          </div>

          {/* Form Create/Edit Game */}
          {gameFormOpen && (
            <form onSubmit={handleGameSubmit} className="bg-[#050505] border border-white/10 rounded-2xl p-5 space-y-4 text-xs text-white/80">
              <h4 className="text-xs font-black text-blue-500 border-b border-white/10 pb-2 uppercase tracking-widest">
                {editingGameId ? "EDITAR JOGO SELECIONADO" : "CADASTRAR NOVO JOGO"}
              </h4>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">Time Mandante</label>
                  <input
                    type="text"
                    required
                    value={gHomeTeam}
                    onChange={(e) => setGHomeTeam(e.target.value)}
                    placeholder="ex: Brasil"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">Time Visitante</label>
                  <input
                    type="text"
                    required
                    value={gAwayTeam}
                    onChange={(e) => setGAwayTeam(e.target.value)}
                    placeholder="ex: Haiti"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">Data amigável (BR)</label>
                  <input
                    type="text"
                    required
                    value={gDate}
                    onChange={(e) => setGDate(e.target.value)}
                    placeholder="ex: 19 de junho, sexta-feira"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">Horário (BR)</label>
                  <input
                    type="text"
                    required
                    value={gTime}
                    onChange={(e) => setGTime(e.target.value)}
                    placeholder="ex: 21h30"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">Local da Partida</label>
                  <input
                    type="text"
                    required
                    value={gLocation}
                    onChange={(e) => setGLocation(e.target.value)}
                    placeholder="ex: Hard Rock Stadium, Miami"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">
                    Disparo Cronômetro (Data/Horário Real para Countdown)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={gTimestampStr}
                    onChange={(e) => setGTimestampStr(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="game_active"
                    checked={gIsActive}
                    onChange={(e) => setGIsActive(e.target.checked)}
                    className="rounded text-blue-500 bg-[#050505] border-white/10 h-4 w-4"
                  />
                  <label htmlFor="game_active" className="text-white/80 font-bold uppercase tracking-wider text-[10px] cursor-pointer">Aberto para palpites dos torcedores?</label>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setGameFormOpen(false)}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px]"
                >
                  {editingGameId ? "Salvar Jogo" : "Cadastrar Jogo"}
                </button>
              </div>
            </form>
          )}

          {/* Form de Inserção de Placar */}
          {scoreFormGameId && (
            <form onSubmit={handleScoreSubmit} className="bg-[#050505] border border-white/10 rounded-2xl p-5 space-y-4 text-xs text-white/80 animate-zoom-in">
              <h4 className="text-xs font-black text-blue-500 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle className="w-4 h-4" /> INFORMAR RESULTADO FINAL E PROCESSAR PONTOS
              </h4>

              <div className="bg-[#111] p-3 rounded-xl text-center font-black text-white border border-white/10 uppercase tracking-widest text-xs">
                {games.find((g) => g.id === scoreFormGameId)?.homeTeam} x{" "}
                {games.find((g) => g.id === scoreFormGameId)?.awayTeam}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">
                    Gols {games.find((g) => g.id === scoreFormGameId)?.homeTeam}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={scoreHome}
                    onChange={(e) => setScoreHome(e.target.value)}
                    placeholder="0"
                    className="w-full text-center bg-[#111] border border-white/10 rounded-xl p-3 text-white text-base font-black font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">
                    Gols {games.find((g) => g.id === scoreFormGameId)?.awayTeam}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={scoreAway}
                    onChange={(e) => setScoreAway(e.target.value)}
                    placeholder="0"
                    className="w-full text-center bg-[#111] border border-white/10 rounded-xl p-3 text-white text-base font-black font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider font-bold">
                    Quem fez o primeiro gol da partida?
                  </label>
                  <select
                    required
                    value={scoreFirstGoal}
                    onChange={(e) => setScoreFirstGoal(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione uma opção...</option>
                    <option value={games.find((g) => g.id === scoreFormGameId)?.homeTeam}>
                      {games.find((g) => g.id === scoreFormGameId)?.homeTeam}
                    </option>
                    <option value={games.find((g) => g.id === scoreFormGameId)?.awayTeam}>
                      {games.find((g) => g.id === scoreFormGameId)?.awayTeam}
                    </option>
                    <option value="Ninguém">Ninguém (Placar em Branco)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setScoreFormGameId(null)}
                  className="bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 px-4 py-2.5 rounded-xl font-bold uppercase text-[9px] tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-400 px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                >
                  Salvar & Computar Pontos
                </button>
              </div>
            </form>
          )}

          {/* List of games table */}
          <div className="grid grid-cols-1 gap-3.5">
            {games.length === 0 ? (
              <p className="text-white/40 text-xs p-8 text-center uppercase font-bold tracking-widest">Nenhum jogo cadastrado.</p>
            ) : (
              games.map((game) => (
                <div
                  key={game.id}
                  className="bg-[#050505] border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="font-extrabold text-sm text-white flex items-center gap-1.5 select-none">
                         <span>{getTeamFlag(game.homeTeam)}</span>
                         <span>{game.homeTeam}</span>
                         <span className="text-white/30 text-xs text-medium">x</span>
                         <span>{getTeamFlag(game.awayTeam)}</span>
                         <span>{game.awayTeam}</span>
                       </span>
                      {game.isActive ? (
                        <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-blue-500/20">
                          Ativo
                        </span>
                      ) : (
                        <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-red-500/20">
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 font-semibold">
                      {game.date} • {game.time} • <span className="italic">{game.location}</span>
                    </p>
                    <p className="text-[9px] text-white/30 font-mono">
                      Timestamp: {new Date(game.gameTimestamp).toLocaleString("pt-BR")}
                    </p>

                    {/* Mostrar placar se definido */}
                    {game.homeScore !== null && game.homeScore !== undefined ? (
                      <div className="mt-2 inline-flex items-center gap-2.5 bg-blue-500/10 text-blue-500 p-2 rounded-xl border border-blue-500/15 font-bold text-[10px] uppercase">
                        <span>Resultado Final: {game.homeScore} x {game.awayScore}</span>
                        <span className="text-white/20">|</span>
                        <span>1º Gol: {game.firstGoalScorer}</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-white/40 uppercase tracking-widest text-[9px] font-bold">Aguardando resultado</div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <button
                      onClick={() => {
                        setScoreHome(game.homeScore !== null && game.homeScore !== undefined ? String(game.homeScore) : "");
                        setScoreAway(game.awayScore !== null && game.awayScore !== undefined ? String(game.awayScore) : "");
                        setScoreFirstGoal(game.firstGoalScorer || "");
                        setScoreFormGameId(game.id);
                      }}
                      className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/25 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Placar Final
                    </button>
                    <button
                      onClick={async () => {
                        await updateGame(game.id, { isActive: !game.isActive });
                        onRefreshData();
                      }}
                      className="bg-[#111] hover:bg-white/5 border border-white/10 text-white/80 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {game.isActive ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => startEditGame(game)}
                      className="bg-[#111] hover:bg-white/5 border border-white/10 text-white/80 p-2.5 rounded-xl cursor-pointer"
                      title="Editar informações físicas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGame(game)}
                      className="bg-red-500/[0.03] hover:bg-red-500/10 text-red-500 border border-red-500/20 p-2.5 rounded-xl cursor-pointer"
                      title="Apagar jogo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/********* TAB: PALPITES *********/}
      {activeTab === "bets" && (
        <div className="space-y-4 animate-fade-in">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Buscar por nome ou celular do participante..."
                value={betSearch}
                onChange={(e) => setBetSearch(e.target.value)}
                className="w-full bg-[#050505] text-xs text-white border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <select
              value={betStatusFilter}
              onChange={(e: any) => setBetStatusFilter(e.target.value)}
              className="bg-[#050505] border border-white/10 text-xs text-white rounded-xl p-3 outline-none font-bold focus:border-blue-500 cursor-pointer uppercase tracking-wider text-[10px]"
            >
              <option value="all">Todas as Inscrições</option>
              <option value="pending">Aguardando PIX (Pendentes)</option>
              <option value="confirmed">PIX Confirmado (Ativos)</option>
            </select>
          </div>

          {/* List of bets table */}
          <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
            {filteredBets.length === 0 ? (
              <p className="text-white/40 text-xs p-8 text-center bg-[#050505] border border-white/10 rounded-3xl uppercase font-bold tracking-widest">
                Nenhum palpite correspondente aos critérios de busca.
              </p>
            ) : (
              filteredBets.map((bet) => {
                const associatedGame = games.find((g) => g.id === bet.gameId);
                return (
                  <div
                    key={bet.id}
                    className="bg-[#050505] border border-white/10 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#f8fafc] text-sm">{bet.userName}</span>
                        <span className="text-white/40 font-mono">({bet.userPhone})</span>
                      </div>
                      <p className="text-blue-500 font-bold uppercase tracking-widest text-[9px]">
                        Jogo: {associatedGame ? `${associatedGame.homeTeam} x ${associatedGame.awayTeam}` : "Jogo Removido"}
                      </p>
                      <div className="bg-[#111] p-3 rounded-2xl border border-white/5 inline-flex flex-col space-y-1 mt-1 font-semibold">
                        <div className="text-white/70">
                          Previsão Placar:{" "}
                          <span className="text-white font-extrabold font-mono text-sm inline-block ml-1">
                            {bet.homePrediction} × {bet.awayPrediction}
                          </span>
                        </div>
                        <div className="text-white/70">
                          Primeiro gol: <span className="text-yellow-500 font-bold ml-1">{bet.firstGoalPrediction}</span>
                        </div>
                      </div>

                      {/* Display calculated points if game is finalized */}
                      {bet.calculatedPoints !== null && (
                        <div className="mt-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold py-1 px-2.5 rounded-lg inline-block border border-blue-500/15 uppercase">
                          Pontos Obtidos: {bet.calculatedPoints} pts
                        </div>
                      )}
                    </div>

                    {/* Payment adjustment buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleConfirmPayment(bet, bet.status === "pending")}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer ${
                          bet.status === "confirmed"
                            ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/10"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                        }`}
                      >
                        {bet.status === "confirmed" ? (
                          <>
                            <X className="w-3 h-3" /> Tornar Pendente
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" /> Confirmar PIX
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteBet(bet)}
                        className="bg-red-500/[0.03] hover:bg-red-500/10 text-red-500 border border-red-500/20 p-2.5 rounded-2xl transition cursor-pointer"
                        title="Deletar Aposta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/********* TAB: CONFIGURAÇÕES PIX *********/}
      {activeTab === "settings" && (
        <div className="space-y-4 animate-fade-in">
          <form onSubmit={handleSavePixSettings} className="bg-[#050505]/40 border border-white/10 rounded-3xl p-5 space-y-4 text-xs">
            <h4 className="text-xs font-black text-blue-500 flex items-center gap-1.5 uppercase tracking-wider pb-1 border-b border-white/10">
              <QrCode className="w-4 h-4 text-blue-500" /> ATUALIZAR DADOS DO QR CODE PIX
            </h4>

            <div>
              <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">
                Chave PIX (Telefone, E-mail, CNPJ ou Aleatória)
              </label>
              <input
                type="text"
                required
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Insira a chave..."
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">
                Nome do Favorecido/Recebedor
              </label>
              <input
                type="text"
                required
                value={pixReceiver}
                onChange={(e) => setPixReceiver(e.target.value)}
                placeholder="Nome completo ou empresa..."
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-white/40 mb-1.5 tracking-wider">
                WhatsApp do Administrador (Para recebimento de comprovantes)
              </label>
              <input
                type="text"
                required
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="Exemplo: 556186267773"
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1 font-medium select-none">
                Insira o DDI (55 para Brasil), o DDD e o número completo (ex: 556186267773). Não use espaços, hifens ou parênteses.
              </p>
            </div>

            {settingsSuccess && (
              <p className="text-blue-500 font-bold uppercase tracking-wider text-[10px] p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" />
                {settingsSuccess}
              </p>
            )}

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 px-6 rounded-2xl cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all uppercase tracking-wider text-[10px]"
            >
              Salvar Configurações
            </button>
          </form>
        </div>
      )}

      {/* Modal de Confirmação para Apagar Palpite */}
      {betToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-6 shadow-2xl relative">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Excluir Palpite?</h3>
              <p className="text-zinc-400 font-semibold text-xs leading-relaxed">
                Você tem certeza que deseja remover permanentemente o palpite do participante <span className="text-white font-black">{betToDelete.userName}</span>?
              </p>
              {(() => {
                const game = games.find(g => g.id === betToDelete.gameId);
                return game ? (
                  <p className="text-red-400 font-bold text-[11px] bg-red-500/5 p-2 rounded-xl mt-2">
                    Jogo: {game.homeTeam} x {game.awayTeam} (Previsão: {betToDelete.homePrediction} x {betToDelete.awayPrediction})
                  </p>
                ) : null;
              })()}
              <p className="text-[10px] text-zinc-500 font-medium">⚠️ Esta ação é irreversível.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBetToDelete(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-300 font-black py-3 rounded-2xl uppercase tracking-widest text-[10px] cursor-pointer transition font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteBet}
                className="flex-1 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-black py-3 rounded-2xl uppercase tracking-widest text-[10px] cursor-pointer transition font-bold"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Apagar Jogo */}
      {gameToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-6 shadow-2xl relative">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Excluir Partida?</h3>
              <p className="text-zinc-400 font-semibold text-xs leading-relaxed">
                Você tem certeza que deseja remover permanentemente o jogo <span className="text-white font-black">{gameToDelete.homeTeam} x {gameToDelete.awayTeam}</span>?
              </p>
              <p className="text-red-400 font-bold text-[10px] bg-red-500/5 p-2 rounded-xl mt-2">
                Todos os palpites vinculados a este jogo poderão ficar órfãos ou ser excluídos.
              </p>
              <p className="text-[10px] text-zinc-500 font-medium">⚠️ Esta ação é irreversível.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setGameToDelete(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-300 font-black py-3 rounded-2xl uppercase tracking-widest text-[10px] cursor-pointer transition font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteGame}
                className="flex-1 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-black py-3 rounded-2xl uppercase tracking-widest text-[10px] cursor-pointer transition font-bold"
              >
                Apagar Jogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
