import React, { useState } from "react";
import { MapPin, Calendar, HelpCircle, Trophy, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { Game } from "../types";
import { getTeamFlag } from "../lib/flags";

interface CountdownProps {
  // Keeping targetTimestamp so we don't break App.tsx type checks, though we won't show the clock
  targetTimestamp: number;
  gameLabel: string;
  game?: Game;
}

export default function Countdown({ targetTimestamp, gameLabel, game }: CountdownProps) {
  const [showRules, setShowRules] = useState(false);

  const homeFlag = game ? getTeamFlag(game.homeTeam) : "⚽";
  const awayFlag = game ? getTeamFlag(game.awayTeam) : "⚽";

  const handleScrollToForm = () => {
    const element = document.getElementById("palpite-form");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden animate-fade-in space-y-5">
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-black text-white/90 uppercase tracking-widest text-[10px]">PRÓXIMO CONFRONTO</h3>
        </div>
        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
          Palpites Abertos
        </span>
      </div>

      {/* Visual Match Presentation with Flags */}
      {game ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-sm mx-auto my-1 px-2">
            {/* Home Team */}
            <div className="flex flex-col items-center text-center w-28">
              <div className="w-16 h-16 bg-[#050505]/80 rounded-full mb-2 flex items-center justify-center border border-white/15 shadow-xl shadow-black/40 hover:scale-105 transition duration-200">
                <span className="text-3xl select-none" role="img" aria-label={game.homeTeam}>
                  {homeFlag}
                </span>
              </div>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider block leading-tight">{game.homeTeam}</span>
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-white select-none bg-white/10 border border-white/25 rounded-full px-3 py-1.5 flex items-center justify-center tracking-widest shadow-md">
                VS
              </span>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center text-center w-28">
              <div className="w-16 h-16 bg-[#050505]/80 rounded-full mb-2 flex items-center justify-center border border-white/15 shadow-xl shadow-black/40 hover:scale-105 transition duration-200">
                <span className="text-3xl select-none" role="img" aria-label={game.awayTeam}>
                  {awayFlag}
                </span>
              </div>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider block leading-tight">{game.awayTeam}</span>
            </div>
          </div>

          {/* Match Physics Date & Place */}
          <div className="text-[10px] text-zinc-200 text-center font-bold bg-black/40 rounded-2xl py-2.5 px-4 border border-white/5 mt-3 space-y-1 w-full max-w-xs">
            <p className="flex items-center justify-center gap-1.5 text-white">
              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{game.date} às {game.time}</span>
            </p>
            <p className="flex items-center justify-center gap-1.5 text-zinc-200 text-[9px] uppercase tracking-wider">
              <MapPin className="w-3 h-3 text-zinc-300 shrink-0" />
              <span className="truncate">{game.location}</span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/60 mb-3 font-medium text-center">
          Palpite antes que a bola role em: <br />
          <span className="text-white font-bold text-sm tracking-tight inline-block mt-1">{gameLabel}</span>
        </p>
      )}

      {/* Primary Call To Action Button (Fazer Palpite) */}
      <button
        onClick={handleScrollToForm}
        className="w-full bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black py-4 px-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-lg shadow-blue-500/20 border border-blue-500/10 font-sans"
      >
        <Edit3 className="w-4 h-4 text-white" />
        Fazer Meu Palpite Agora
      </button>

      {/* Collapsible Score Rules Accordion (Como funciona o bolão) */}
      <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all duration-200">
        <button
          onClick={() => setShowRules(!showRules)}
          type="button"
          className="w-full flex items-center justify-between p-3.5 text-xs text-left font-extrabold text-white uppercase tracking-wider hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="text-sm">📚</span> Como funciona a pontuação?
          </span>
          <span className="text-white/50">
            {showRules ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showRules && (
          <div className="p-4 pt-1 border-t border-white/5 space-y-3 bg-black/25 text-[11px] text-zinc-100 leading-relaxed font-semibold animate-fade-in">
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-400 text-slate-950 rounded-full font-black flex items-center justify-center text-[10px]">10</span>
              <div>
                <p className="font-extrabold text-white">Placar Exato</p>
                <p className="text-[10px] text-zinc-300 font-medium">Acertou o resultado exato na régua (ex: palpito 2-1, termina 2-1)!</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-slate-950 rounded-full font-black flex items-center justify-center text-[10px]">07</span>
              <div>
                <p className="font-extrabold text-white">Vencedor + Saldo de Gols</p>
                <p className="text-[10px] text-zinc-300 font-medium">Acertou quem ganhou e a diferença exata de gols (ex: palpito 2-0, termina 3-1).</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-slate-950 rounded-full font-black flex items-center justify-center text-[10px]">05</span>
              <div>
                <p className="font-extrabold text-white">Vencedor / Empate Simples</p>
                <p className="text-[10px] text-zinc-300 font-medium">Acertou quem ganhou de forma simples ou se foi empate (ex: jogou 1-0, termina 3-0).</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-6 h-6 bg-cyan-400 text-slate-950 rounded-full font-black flex items-center justify-center text-[10px]">+3</span>
              <div>
                <p className="font-extrabold text-yellow-400">Bônus de 1º Gol</p>
                <p className="text-[10px] text-zinc-300 font-medium">Acertou qual seleção ou se ninguém marcou o primeiro gol do confronto.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
