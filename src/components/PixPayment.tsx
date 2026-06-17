import React, { useState } from "react";
import {
  Check,
  Copy,
  ShieldCheck,
  Sparkles,
  Share2,
  Users
} from "lucide-react";
import { Game } from "../types";
import { getTeamFlag } from "../lib/flags";
import { generatePixPayload } from "../lib/pix";

interface PixPaymentProps {
  betId: string;
  userName: string;
  userPhone: string;
  game: Game;
  homePrediction: number;
  awayPrediction: number;
  firstGoalPrediction: string;
  pixKey: string;
  pixReceiver: string;
  adminPhone: string;
  onReset: () => void;
}

export default function PixPayment({
  betId,
  userName,
  userPhone,
  game,
  homePrediction,
  awayPrediction,
  firstGoalPrediction,
  pixKey,
  pixReceiver,
  adminPhone,
  onReset,
}: PixPaymentProps) {
  const [copiaColaCopied, setCopiaColaCopied] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const betValue = "R$ 10,00";

  const pixPayload = generatePixPayload(pixKey, pixReceiver, "10.00");

  const handleCopyCopiaCola = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiaColaCopied(true);
    setTimeout(() => setCopiaColaCopied(false), 2000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=000000&bgcolor=ffffff&data=${encodeURIComponent(
    pixPayload
  )}`;

  const groupLink = "https://chat.whatsapp.com/DGLt6l0RCRJ1ZeH2TVafvu";
  
  // Format the ticket details
  const ticketText = `Olá! Acabei de enviar meu palpite no *Bolão WL - Copa do Mundo 2026* ⚽⚽\n\n👤 *Nome*: ${userName}\n📲 *WhatsApp/Celular*: ${userPhone}\n🏟️ *Partida*: ${game.homeTeam} x ${game.awayTeam}\n🔮 *Meu Palpite*: ${homePrediction} x ${awayPrediction}\n⚽ *1º Autor do Gol*: ${firstGoalPrediction || "Não definido"}\n🛡️ *ID do Bilhete*: WL-${betId.toUpperCase().slice(-6)}\n\n📋 Segue o comprovante do PIX 🧾`;

  // Clean the admin phone number to digits only
  const cleanedAdminPhone = adminPhone.replace(/\D/g, "");
  
  // Direct send link to configured admin contact
  const whatsappAdminLink = `https://api.whatsapp.com/send/?phone=${cleanedAdminPhone}&text=${encodeURIComponent(ticketText)}`;

  const handleCopyTicket = () => {
    navigator.clipboard.writeText(ticketText);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl max-w-md mx-auto text-center space-y-6 animate-fade-in relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col items-center">
        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/10 rounded-full flex items-center justify-center mb-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight text-center">Palpite Pré-Registrado!</h2>
        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-1 animate-pulse">
          Siga as Instruções para Ativação do Bilhete
        </p>
      </div>

      {/* Instruções passo-a-passo simples */}
      <div className="bg-[#050505] border border-zinc-800 rounded-2xl p-4 text-left space-y-3">
        <p className="text-xs text-emerald-400 font-extrabold flex items-center gap-1.5">
          <span>🎉</span> Excelente notícia, {userName.split(" ")[0]}!
        </p>
        <p className="text-zinc-300 font-medium text-[11px] leading-relaxed">
          Seu palpite foi gravado em nossa base de dados. Para concluir e ativar o seu bilhete, siga os dois passos abaixo:
        </p>
        <div className="text-[11px] font-semibold text-zinc-400 space-y-2 pt-1 border-t border-white/5">
          <p><span className="text-yellow-400 font-extrabold">Passo 1.</span> Faça o PIX de <span className="text-white font-bold">R$ 10,00</span> usando o QR Code ou copiando a chave.</p>
          <p><span className="text-yellow-400 font-extrabold">Passo 2.</span> Clique no botão verde abaixo para enviar seu bilhete e o comprovante do PIX diretamente para o administrador.</p>
        </div>
      </div>

      {/* Detalhes do palpite */}
      <div className="bg-[#050505]/40 rounded-2xl p-4 text-left border border-white/5 space-y-3 font-medium">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
          <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">
            Resumo do Seu Palpite
          </h4>
        </div>
        
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <span className="text-white/40">Participante:</span>
          <span className="text-white font-extrabold text-right truncate">{userName}</span>

          <span className="text-white/40">Partida:</span>
          <span className="text-white font-extrabold text-right flex items-center justify-end gap-1">
            <span>{getTeamFlag(game.homeTeam)}</span>
            <span className="truncate max-w-[50px] inline-block">{game.homeTeam}</span>
            <span className="text-white/30 text-[10px]">x</span>
            <span>{getTeamFlag(game.awayTeam)}</span>
            <span className="truncate max-w-[50px] inline-block">{game.awayTeam}</span>
          </span>

          <span className="text-white/40">Palpite:</span>
          <span className="text-blue-500 font-black text-right text-sm">
            {homePrediction} × {awayPrediction}
          </span>

          <span className="text-white/40">1º Gol:</span>
          <span className="text-white font-bold text-right truncate">
            {firstGoalPrediction || "Não definido"}
          </span>

          <span className="text-white/40">Taxa do Palpite:</span>
          <span className="text-yellow-500 font-extrabold text-right text-sm">{betValue}</span>

          <span className="text-white/40">ID do Bilhete:</span>
          <span className="text-zinc-500 font-mono text-[10px] text-right truncate select-all">
            WL-{betId.toUpperCase().slice(-6)}
          </span>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center space-y-4 bg-[#050505]/95 p-5 rounded-2xl border border-white/5">
        <div className="text-center space-y-0.5 border-b border-white/5 pb-3 w-full">
          <p className="text-xs font-black text-white/95 uppercase tracking-wider flex items-center justify-center gap-1.5 leading-none">
            <span>💸</span> Pagamento via PIX Copiar e Colar
          </p>
          <p className="text-lg font-black text-yellow-500 tracking-tight leading-none mt-1">
            R$ 10,00
          </p>
        </div>

        <div className="bg-white p-2.5 rounded-2xl shadow-xl shadow-black/40 border border-white/10 relative group">
          <img
            src={qrCodeUrl}
            alt="QR Code Pix"
            className="w-40 h-40 block rounded-lg select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="text-center space-y-0.5 pt-1">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Favorecido:</p>
          <p className="text-xs font-bold text-white/90">{pixReceiver}</p>
        </div>
      </div>

      {/* Pix Copia e Cola Code */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-yellow-500 uppercase block tracking-widest text-left flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></span>
          PIX Copia e Cola (Ideal para Celular)
        </label>
        <div className="flex gap-2 bg-[#050505] border border-white/5 rounded-xl p-2.5 items-center justify-between">
          <span className="text-xs font-mono text-white/50 truncate select-all text-left flex-grow max-w-[210px] sm:max-w-[240px] block">
            {pixPayload}
          </span>
          <button
            onClick={handleCopyCopiaCola}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer shrink-0 transition-all duration-150 active:scale-95 shadow-md shadow-yellow-500/10"
          >
            {copiaColaCopied ? (
              <>
                <Check className="w-3" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3" />
                Copiar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        {/* Action to Send message directly on WhatsApp with prefilled text */}
        <a
          href={whatsappAdminLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            // Copy to clipboard just in case
            try {
              navigator.clipboard.writeText(ticketText);
              setCopiedTicket(true);
              setTimeout(() => setCopiedTicket(false), 2000);
            } catch (e) {
              console.error("Clipboard copy failed", e);
            }
          }}
          className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20ba5a] active:scale-98 transition-all duration-150 text-zinc-950 font-black py-4 rounded-2xl uppercase tracking-widest text-xs cursor-pointer shadow-lg shadow-emerald-500/20 text-center justify-center align-middle"
        >
          <Share2 className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
          Enviar Comprovante (WhatsApp)
        </a>

        {/* Action to Join WhatsApp Group */}
        <a
          href={groupLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full bg-zinc-800 hover:bg-zinc-700 active:scale-98 transition-all duration-150 text-white font-black py-3.5 rounded-2xl uppercase tracking-widest text-[11px] cursor-pointer border border-white/10 text-center justify-center align-middle"
        >
          <Users className="w-4 h-4 text-zinc-400" />
          Acessar Grupo de Palpites
        </a>

        {/* Fallback copy button */}
        <button
          onClick={handleCopyTicket}
          className="flex items-center justify-center gap-1.5 w-full bg-zinc-900/50 hover:bg-zinc-850 active:scale-98 text-zinc-400 hover:text-white font-semibold py-2.5 rounded-xl text-[10px] cursor-pointer transition border border-white/5"
        >
          {copiedTicket ? (
            <>
              <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
              Bilhete Copiado com Sucesso!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-zinc-500" />
              Copiar Bilhete Manualmente
            </>
          )}
        </button>

        {/* Action to Go Back & Bet Again */}
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 w-full bg-zinc-900 hover:bg-zinc-850 active:scale-98 text-zinc-400 font-black py-3 rounded-2xl uppercase tracking-widest text-[10px] cursor-pointer transition font-bold"
        >
          Criar Outro Palpite
        </button>
      </div>
    </div>
  );
}
