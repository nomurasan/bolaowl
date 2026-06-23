import React, { useState, useEffect } from "react";
import { Trophy, Search, Hash, Medal, Star, Calendar } from "lucide-react";
import { Game, Bet, ParticipantScore } from "../types";
import { calculateRanking } from "../lib/dbHelper";

interface LeaderboardProps {
  bets: Bet[];
  games: Game[];
}

export default function Leaderboard({ bets, games }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
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
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.homeTeam} x {g.awayTeam} {g.isActive ? "⭐ (Ativo)" : ""}
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

              return (
                <div
                  key={`${p.userPhone}_${index}`}
                  className={`flex items-center justify-between p-4 transition duration-200 ${rowBg}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
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
                    </div>
                  </div>

                  {/* Informações de Pontos */}
                  <div className="text-right flex-shrink-0 flex items-center gap-3.5 pl-3">
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
                  </div>
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
