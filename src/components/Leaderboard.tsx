import React, { useState, useEffect } from "react";
import { Trophy, Search, Hash, Medal, Star, Calendar, ChevronDown, ChevronUp, Award } from "lucide-react";
import { Game, Bet, ParticipantScore } from "../types";
import { calculateRanking } from "../lib/dbHelper";

interface LeaderboardProps {
  bets: Bet[];
  games: Game[];
}

function getBetPointsDetails(bet: Bet, game: Game | undefined) {
  if (!game) {
    return {
      hasScores: false,
      scoreText: "—",
      baseLabel: "Partida não encontrada",
      totalPoints: 0,
      details: [],
      firstGoalScorer: ""
    };
  }

  const hasGameScores =
    game.homeScore !== null &&
    game.homeScore !== undefined &&
    game.awayScore !== null &&
    game.awayScore !== undefined;

  if (!hasGameScores) {
    return {
      hasScores: false,
      scoreText: "Partida não iniciada",
      baseLabel: "Aguardando Resultado",
      totalPoints: 0,
      details: [],
      firstGoalScorer: ""
    };
  }

  const hPred = bet.homePrediction;
  const aPred = bet.awayPrediction;
  const hScore = game.homeScore!;
  const aScore = game.awayScore!;

  let basePoints = 0;
  let baseLabel = "Não pontuou no resultado principal";
  let exactHit = false;
  let winnerDiffHit = false;
  let winnerHit = false;

  if (hPred === hScore && aPred === aScore) {
    basePoints = 10;
    baseLabel = "Placar Exato (10 pts)";
    exactHit = true;
  } else {
    const predictedWinner =
      hPred > aPred ? "home" : hPred < aPred ? "away" : "draw";
    const actualWinner =
      hScore > aScore ? "home" : hScore < aScore ? "away" : "draw";

    if (predictedWinner === actualWinner) {
      const predictedDiff = hPred - aPred;
      const actualDiff = hScore - aScore;

      if (predictedDiff === actualDiff) {
        basePoints = 7;
        baseLabel = "Vencedor + Saldo de Gols (7 pts)";
        winnerDiffHit = true;
      } else {
        basePoints = 5;
        baseLabel = "Apenas Vencedor/Empate (5 pts)";
        winnerHit = true;
      }
    }
  }

  const firstGoalScorer = game.firstGoalScorer || "Ninguém";
  const firstGoalPrediction = bet.firstGoalPrediction || "";
  const firstGoalHit =
    !!firstGoalScorer &&
    !!firstGoalPrediction &&
    firstGoalPrediction.trim().toLowerCase() === firstGoalScorer.trim().toLowerCase();

  const totalPoints = basePoints + (firstGoalHit ? 3 : 0);

  const detailsList = [
    {
      label: "Acerto de Placar Exato (+10 pts)",
      met: exactHit,
      points: exactHit ? 10 : 0
    },
    {
      label: "Vencedor + Saldo de Gols (+7 pts)",
      met: winnerDiffHit,
      points: winnerDiffHit ? 7 : 0
    },
    {
      label: "Vencedor ou Empate (+5 pts)",
      met: winnerHit,
      points: winnerHit ? 5 : 0
    },
    {
      label: `Bônus: Autor do 1º Gol (${firstGoalScorer}) (+3 pts)`,
      met: firstGoalHit,
      points: firstGoalHit ? 3 : 0,
      extra: `Palpitou: "${firstGoalPrediction}"`
    }
  ];

  return {
    hasScores: true,
    scoreText: `${hScore} x ${aScore}`,
    baseLabel,
    totalPoints,
    details: detailsList,
    firstGoalHit,
    exactHit,
    winnerDiffHit,
    winnerHit,
    firstGoalScorer
  };
}

export default function Leaderboard({ bets, games }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Encontrar o jogo ativo para definir o padrão inicial
  const activeGame = (games || []).find((g) => g && g.isActive);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // Sempre que a lista de jogos carregar ou mudar, definir a seleção inicial para o jogo ativo ou primeiro jogo
  useEffect(() => {
    if (games && games.length > 0) {
      if (activeGame) {
        setSelectedGameId(activeGame.id);
      } else {
        const firstGame = games[0];
        if (firstGame) setSelectedGameId(firstGame.id);
      }
    }
  }, [games, activeGame]);

  const [participants, setParticipants] = useState<ParticipantScore[]>([]);

  // Recalcular o ranking por partida selecionada de forma reativa e assíncrona
  useEffect(() => {
    async function updateRanking() {
      // Filtrar palpites deste jogo específico
      const filteredBets = (bets || []).filter((b) => b && b.gameId === selectedGameId);
      const items = await calculateRanking(filteredBets);
      setParticipants(items);
    }
    if (selectedGameId) {
      updateRanking();
    } else {
      setParticipants([]);
    }
  }, [bets, selectedGameId]);

  // Filtrar participantes por nome ou telefone
  const filteredParticipants = (participants || []).filter(
    (p) => {
      if (!p) return false;
      const rawName = p.userName || "";
      const rawPhone = p.userPhone || "";
      return (
        rawName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rawPhone.includes(searchTerm)
      );
    }
  );

  // Formatar número de telefone de forma segura/privada para proteger dados do participante
  const formatPrivatePhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) return phone;
    
    const ddd = cleaned.substring(0, 2);
    const firstPart = cleaned.length === 11 ? cleaned.substring(2, 7) : cleaned.substring(2, 6);
    const lastPart = cleaned.substring(cleaned.length - 4);
    
    const obfuscated = firstPart.slice(0, 1) + "****";
    return `(${ddd}) ${obfuscated}-${lastPart}`;
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-fade-in space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Líderes do Bolão</h3>
            <p className="text-[10px] text-white/40 font-medium">Pontuação acumulada baseada nos palpites válidos</p>
          </div>
        </div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">
          Ranking por Jogo
        </span>
      </div>

      {/* Sistema de Pontuação Aplicado */}
      <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/15 border border-white/10 rounded-2xl p-4.5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-yellow-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Sistema de Pontuação Aplicado</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md">Regras Oficiais</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#050505]/80 border border-white/5 rounded-xl p-3 flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 bg-blue-600 text-white rounded-lg font-black flex items-center justify-center text-xs font-mono">10</span>
            <div className="space-y-0.5">
              <p className="text-xs font-black text-white">Placar Exato (PE)</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Acertou o placar exato da partida (Exemplo: palpite 2x1, resultado 2x1).
              </p>
            </div>
          </div>
          <div className="bg-[#050505]/80 border border-white/5 rounded-xl p-3 flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 bg-yellow-500 text-slate-950 rounded-lg font-black flex items-center justify-center text-xs font-mono">07</span>
            <div className="space-y-0.5">
              <p className="text-xs font-black text-white">Vencedor + Saldo de Gols</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Acertou o vencedor e o saldo de gols (Exemplo: palpite 2x0, resultado 3x1).
              </p>
            </div>
          </div>
          <div className="bg-[#050505]/80 border border-white/5 rounded-xl p-3 flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 bg-amber-600 text-white rounded-lg font-black flex items-center justify-center text-xs font-mono">05</span>
            <div className="space-y-0.5">
              <p className="text-xs font-black text-white">Vencedor / Empate Simples</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Acertou apenas o time vencedor ou empate simples (Exemplo: palpite 1x0, resultado 3x0).
              </p>
            </div>
          </div>
          <div className="bg-[#050505]/80 border border-white/5 rounded-xl p-3 flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 bg-indigo-500 text-white rounded-lg font-black flex items-center justify-center text-xs font-mono">+3</span>
            <div className="space-y-0.5">
              <p className="text-xs font-black text-indigo-300">Bônus: Autor do 1º Gol</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Acertou a Seleção/Time que inaugurou o placar (Soma adicional aos pontos do placar).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Confronto */}
      {games && games.length > 1 && (
        <div className="bg-[#050505]/60 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xs font-bold text-zinc-300">Selecione o Confronto:</span>
          </div>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-xs truncate"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.homeTeam} x {g.awayTeam} {g.isActive ? "⭐ (Ativo)" : ""} — {g.rateioRealizado ? "Rateio Realizado ✅" : "Aguardando Rateio ⏳"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Se houver apenas 1 jogo, mostramos fixo discretamente */}
      {games && games.length === 1 && games[0] && (
        <div className="bg-blue-950/20 border border-blue-500/10 rounded-xl p-3 text-[11px] font-semibold text-blue-400 flex items-center gap-2">
          <Calendar className="w-4 h-4 shrink-0" />
          Visualizando ranking do confronto: <span className="text-white font-extrabold">{games[0].homeTeam} x {games[0].awayTeam}</span>
        </div>
      )}

      {/* Status Financeiro da Partida Selecionada */}
      {(() => {
        const selGame = games.find((g) => g.id === selectedGameId) || (games && games[0]);
        if (!selGame) return null;
        const isRateio = selGame.rateioRealizado === true;
        return (
          <div className={`border rounded-2xl p-4 flex items-center justify-between gap-3 ${
            isRateio
              ? "bg-emerald-950/10 border-emerald-500/20 text-emerald-400"
              : "bg-amber-950/10 border-amber-500/20 text-amber-400"
          }`}>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Status Financeiro do Jogo:</p>
              <p className="text-xs font-bold text-white">
                {selGame.homeTeam} x {selGame.awayTeam}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 font-black uppercase tracking-wider text-[9px] bg-[#050505]">
              <span className={`w-2 h-2 rounded-full ${isRateio ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
              <span>{isRateio ? "Rateio Realizado" : "Aguardando Rateio"}</span>
            </div>
          </div>
        );
      })()}

      {/* Busca */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="w-4 h-4 text-white/40" />
        </span>
        <input
          type="text"
          placeholder="Buscar participante pelo nome ou cel..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#050505] text-xs text-white placeholder-white/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-all duration-200 font-medium"
        />
      </div>

      {/* Tabela do Ranking (por jogo selecionado) */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050505]/40">
        <div className="max-h-96 overflow-y-auto divide-y divide-white/10">
          {filteredParticipants.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/40 font-semibold uppercase tracking-wider">
              Nenhum participante encontrado no ranking para este jogo.
            </div>
          ) : (
            filteredParticipants.map((p, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;
              
              const rowBg = rank === 1 
                ? "bg-yellow-500/[0.02] hover:bg-yellow-500/[0.06]" 
                : rank === 2 
                ? "bg-slate-300/[0.02] hover:bg-slate-300/[0.06]" 
                : rank === 3 
                ? "bg-amber-700/[0.02] hover:bg-amber-700/[0.06]" 
                : "hover:bg-white/[0.02]";

              const userId = `${p.userPhone}_${p.userName}`;
              const isExpanded = expandedUserId === userId;
              const userBets = (bets || []).filter(
                (b) => b && b.gameId === selectedGameId && b.userPhone === p.userPhone && b.status === "confirmed"
              );
              const currentGame = (games || []).find((g) => g && g.id === selectedGameId);

              return (
                <div
                  key={`${p.userPhone}_${index}`}
                  className={`flex flex-col transition duration-200 border-b border-white/5 last:border-0 group ${rowBg}`}
                >
                  <div
                    onClick={() => setExpandedUserId(isExpanded ? null : userId)}
                    className="flex items-center justify-between p-4 cursor-pointer select-none gap-2"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-grow">
                      {/* Badge da Posição */}
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5">
                        {rank === 1 ? (
                          <Medal className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/10" />
                        ) : rank === 2 ? (
                          <Medal className="w-4.5 h-4.5 text-slate-300 fill-slate-300/10" />
                        ) : rank === 3 ? (
                          <Medal className="w-4.5 h-4.5 text-amber-500 fill-amber-500/10" />
                        ) : (
                          <span className="text-xs font-mono font-bold text-white/60">
                            {rank}º
                          </span>
                        )}
                      </div>

                      {/* Nome & Telefone Ofuscado */}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate flex items-center gap-1.5 leading-tight">
                          {p.userName}
                          {rank === 1 && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                        </p>
                        <p className="text-[10px] text-white/40 font-bold font-mono mt-0.5">
                          {formatPrivatePhone(p.userPhone)}
                        </p>
                        <p className="text-[9px] text-blue-500/80 font-bold font-mono mt-1 flex items-center gap-1 transition-colors duration-200 group-hover:text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/70 group-hover:bg-blue-400 animate-pulse" />
                          {isExpanded ? "Clique para fechar auditoria" : "Clique para auditar detalhamento"}
                        </p>
                      </div>
                    </div>

                    {/* Informações de Pontos e Chevron */}
                    <div className="flex-shrink-0 flex items-center gap-3 pl-3">
                      {/* Placar Exato hit badges */}
                      {p.exactScoresCount > 0 && (
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/20 font-mono tracking-tight shrink-0">
                          {p.exactScoresCount} PE
                        </span>
                      )}

                      <div className="min-w-16 text-right">
                        {isTopThree ? (
                          <span className="inline-block text-xs font-black px-2.5 py-1 bg-blue-600 text-white rounded-lg shadow-sm">
                            {p.totalPoints} pts
                          </span>
                        ) : (
                          <p className="text-xs font-black text-blue-500 font-mono">
                            {p.totalPoints} pts
                          </p>
                        )}
                        <p className="text-[9px] text-white/40 font-bold font-mono leading-none mt-1">
                          {p.confirmedBetsCount} {p.confirmedBetsCount === 1 ? "palpite" : "palpites"}
                        </p>
                      </div>

                      <div className="text-white/30 hover:text-white transition duration-150">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Audit / Transparency Section */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-black/40 border-t border-white/5 space-y-3 animate-fade-in">
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5 px-1 py-1">
                        <span>Palpites Confirmados e Critérios de Auditoria</span>
                      </div>
                      <div className="space-y-3">
                        {userBets.length === 0 ? (
                          <p className="text-[10px] text-zinc-500 italic p-2 text-center">
                            Nenhum palpite confirmado encontrado para esta partida.
                          </p>
                        ) : (
                          userBets.map((bet, bIndex) => {
                            const details = getBetPointsDetails(bet, currentGame);
                            return (
                              <div
                                key={bet.id}
                                className="bg-[#0b0c10] border border-white/10 rounded-2xl p-4 space-y-3"
                              >
                                {/* Palpite Header */}
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] bg-blue-500/10 text-blue-400 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      Palpite {userBets.length > 1 ? `#${bIndex + 1}` : "Único"}
                                    </span>
                                    <span className="text-xs font-black font-mono text-zinc-200">
                                      Placar: {bet.homePrediction} x {bet.awayPrediction}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-medium">
                                      (1º Gol: <span className="text-zinc-300 font-semibold">{bet.firstGoalPrediction}</span>)
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-blue-400 font-mono">
                                    {bet.calculatedPoints ?? 0} pts
                                  </span>
                                </div>

                                {/* Scoring Breakdown */}
                                {!details.hasScores ? (
                                  <p className="text-[10px] text-zinc-500 font-medium italic">
                                    Esta partida ainda não foi finalizada ou não tem placar oficial cadastrado. A pontuação será calculada de forma totalmente transparente e automática assim que o gestor definir o placar do jogo.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px]">
                                      <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                                        Resultado Oficial: <span className="text-white font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded">{details.scoreText}</span> (1º Gol: {details.firstGoalScorer})
                                      </span>
                                      <span className="text-blue-400 font-black uppercase tracking-wider text-[9px] bg-blue-500/10 px-2 py-0.5 rounded-md self-start sm:self-auto">
                                        {details.baseLabel}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                                      {details.details.map((crit, cIdx) => {
                                        return (
                                          <div
                                            key={cIdx}
                                            className={`flex items-center justify-between p-2 rounded-lg text-[10px] transition duration-150 ${
                                              crit.met
                                                ? "bg-green-500/5 border border-green-500/10 text-green-300"
                                                : "bg-zinc-950/20 border border-white/[0.02] text-zinc-500"
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                  crit.met ? "bg-green-400 animate-pulse" : "bg-zinc-700"
                                                }`}
                                              />
                                              <div className="min-w-0">
                                                <p className={`font-semibold ${crit.met ? "text-green-300" : "text-zinc-500"}`}>
                                                  {crit.label}
                                                </p>
                                                {crit.extra && (
                                                  <p className="text-[9px] text-zinc-500 font-medium font-mono mt-0.5">
                                                    {crit.extra}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <span className={`font-mono font-bold shrink-0 ${crit.met ? "text-green-400 text-xs" : "text-zinc-600"}`}>
                                              {crit.met ? `+${crit.points}` : "0"} pts
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legenda das Regras de Desempate */}
      <div className="bg-[#050505] p-3.5 rounded-2xl border border-white/10 space-y-2">
        <h4 className="text-[9px] font-bold text-white/60 uppercase tracking-widest flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-blue-500" />
          Critérios de Desempate (Por Partida):
        </h4>
        <ol className="text-[9px] text-white/40 list-decimal pl-4.5 space-y-1 font-medium leading-relaxed">
          <li>Maior somatório de pontos obtidos no confronto selecionado</li>
          <li>Maior número de <span className="text-blue-500 font-bold">PE</span> (Placares Exatos acertados) na partida</li>
          <li>Maior volume de palpites pagos/confirmados na partida</li>
        </ol>
      </div>
    </div>
  );
}
