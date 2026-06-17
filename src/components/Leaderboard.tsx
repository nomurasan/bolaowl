import React, { useState } from "react";
import { Trophy, Search, Hash, Medal, Star } from "lucide-react";
import { ParticipantScore } from "../types";

interface LeaderboardProps {
  participants: ParticipantScore[];
}

export default function Leaderboard({ participants }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar participantes por nome ou telefone
  const filteredParticipants = participants.filter(
    (p) =>
      p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userPhone.includes(searchTerm)
  );

  // Formatar número de telefone de forma segura/privada para proteger dados do participante
  // Exemplo: (11) 98765-4321 -> (11) 9****-4321
  const formatPrivatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) return phone; // Fallback se tiver formato inesperado
    
    // Obter partes
    const ddd = cleaned.substring(0, 2);
    const firstPart = cleaned.length === 11 ? cleaned.substring(2, 7) : cleaned.substring(2, 6);
    const lastPart = cleaned.substring(cleaned.length - 4);
    
    // Ofuscar o miolo
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
          Ranking Global
        </span>
      </div>

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

      {/* Tabela do Ranking */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050505]/40">
        <div className="max-h-96 overflow-y-auto divide-y divide-white/10">
          {filteredParticipants.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/40 font-semibold uppercase tracking-wider">
              Nenhum participante encontrado no ranking.
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
          Critérios de Desempate:
        </h4>
        <ol className="text-[9px] text-white/40 list-decimal pl-4.5 space-y-1 font-medium leading-relaxed">
          <li>Maior somatório de pontos gerais obtidos</li>
          <li>Maior número de <span className="text-blue-500 font-bold">PE</span> (Placares Exatos acertados)</li>
          <li>Maior volume de palpites pagos/confirmados</li>
        </ol>
      </div>
    </div>
  );
}

