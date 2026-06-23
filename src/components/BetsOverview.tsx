import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Gamepad2,
  Phone,
  User,
  Calendar,
  Layers
} from "lucide-react";
import { Bet, Game } from "../types";
import { getTeamFlag } from "../lib/flags";

interface BetsOverviewProps {
  bets: Bet[];
  games: Game[];
  entryFee?: number;
}

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "game";
type StatusFilter = "all" | "confirmed" | "pending";

export default function BetsOverview({ bets, games, entryFee }: BetsOverviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  // Encontrar o jogo ativo para definir o padrão inicial
  const activeGame = useMemo(() => (games || []).find((g) => g && g.isActive), [games]);
  const [selectedGameId, setSelectedGameId] = useState<string>("all");

  React.useEffect(() => {
    if (games && games.length > 0) {
      if (activeGame) {
        setSelectedGameId(activeGame.id);
      } else {
        setSelectedGameId("all");
      }
    }
  }, [games, activeGame]);

  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Helper to map Game info quickly
  const gamesMap = useMemo(() => {
    const map = new Map<string, Game>();
    games.forEach((game) => map.set(game.id, game));
    return map;
  }, [games]);

  // Stats calculations for public dashboard (transparency) - now managed/filtered by game!
  const stats = useMemo(() => {
    const gameBets = selectedGameId === "all" ? bets : bets.filter((b) => b.gameId === selectedGameId);
    const totalBets = gameBets.length;
    const confirmedBets = gameBets.filter((b) => b.status === "confirmed");
    const pendingBets = gameBets.filter((b) => b.status === "pending");
    const mult = entryFee !== undefined ? entryFee : 10;
    const cashCollected = confirmedBets.length * mult;
    const uniquePhones = new Set(gameBets.map((b) => b.userPhone)).size;
    
    // For average bets per game, if showing a single game, it's just the total bets of that game.
    const avgBetsPerGame = selectedGameId !== "all" 
      ? totalBets.toFixed(0) 
      : (games.length > 0 ? (totalBets / games.length).toFixed(1) : "0");
    const pendingAmount = pendingBets.length * mult;
    
    return {
      totalBets,
      confirmedCount: confirmedBets.length,
      pendingCount: pendingBets.length,
      cashCollected,
      uniquePhones,
      avgBetsPerGame,
      pendingAmount
    };
  }, [bets, games, selectedGameId, entryFee]);

  // Mask user phone for privacy while keeping useful identifying digits
  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      const ddd = cleaned.slice(-11, -9);
      const prefix = "*****";
      const suffix = cleaned.slice(-4);
      return `(${ddd}) ${prefix}-${suffix}`;
    }
    return phone;
  };

  // Process bets list with search, filter, and sort
  const filteredAndSortedBets = useMemo(() => {
    return bets
      .filter((bet) => {
        if (!bet) return false;
        const game = gamesMap.get(bet.gameId);
        
        const rawName = bet.userName || "";
        const rawPhone = bet.userPhone || "";
        const rawFirstGoal = bet.firstGoalPrediction || "";

        // Match Search Term (Name, Game names, or first scorer prediction)
        const matchSearch =
          rawName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rawPhone.includes(searchTerm) ||
          (game &&
            ((game.homeTeam || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
              (game.awayTeam || "").toLowerCase().includes(searchTerm.toLowerCase()))) ||
          rawFirstGoal.toLowerCase().includes(searchTerm.toLowerCase());

        // Match Status Filter
        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "confirmed" && bet.status === "confirmed") ||
          (statusFilter === "pending" && bet.status === "pending");

        // Match Game Filter
        const matchGame = selectedGameId === "all" || bet.gameId === selectedGameId;

        return matchSearch && matchStatus && matchGame;
      })
      .sort((a, b) => {
        if (!a || !b) return 0;
        switch (sortBy) {
          case "newest":
            return (b.createdAt || 0) - (a.createdAt || 0);
          case "oldest":
            return (a.createdAt || 0) - (b.createdAt || 0);
          case "name-asc":
            return (a.userName || "").localeCompare(b.userName || "");
          case "name-desc":
            return (b.userName || "").localeCompare(a.userName || "");
          case "game": {
            const gameA = gamesMap.get(a.gameId);
            const gameB = gamesMap.get(b.gameId);
            const nameA = gameA ? `${gameA.homeTeam || ""} x ${gameA.awayTeam || ""}` : "";
            const nameB = gameB ? `${gameB.homeTeam || ""} x ${gameB.awayTeam || ""}` : "";
            return nameA.localeCompare(nameB);
          }
          default:
            return 0;
        }
      });
  }, [bets, gamesMap, searchTerm, statusFilter, selectedGameId, sortBy]);

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-fade-in space-y-5">
      {/* Background Blobs for Atmosphere */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Visão Geral dos Palpites</h3>
            <p className="text-[10px] text-white/40 font-medium">Lista completa e detalhada de todos os palpites</p>
          </div>
        </div>
        <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
          {filteredAndSortedBets.length} {filteredAndSortedBets.length === 1 ? "Palpite" : "Palpites"}
        </span>
      </div>

      {/* Transparency Dashboard Widget Grid */}
      <div className="space-y-3">
        <p className="text-[9px] font-black tracking-widest text-[#a1a1aa] uppercase flex flex-wrap items-center gap-1.5 leading-none">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0"></span>
          <span>Painel de Transparência WL</span>
          {selectedGameId !== "all" && gamesMap.has(selectedGameId) && (
            <span className="text-blue-400 font-extrabold normal-case bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] animate-fade-in inline-flex items-center gap-1">
              Partida: {gamesMap.get(selectedGameId)?.homeTeam} x {gamesMap.get(selectedGameId)?.awayTeam}
              {gamesMap.get(selectedGameId)?.isActive && (
                <span className="text-yellow-400 font-bold font-mono">⭐ Ativo</span>
              )}
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Cash Collected Card */}
          <div className="bg-[#050505]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[8px] sm:text-[9px] uppercase font-black text-blue-400 tracking-wider">Arrecadado PIX</span>
            <p className="text-sm min-[360px]:text-base sm:text-lg font-black font-mono text-white mt-1">
              R$ {stats.cashCollected.toFixed(2).replace(".", ",")}
            </p>
          </div>

          {/* Confirmed Bets Card */}
          <div className="bg-[#050505]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[8px] sm:text-[9px] uppercase font-black text-yellow-500 tracking-wider">Confirmados</span>
            <p className="text-sm min-[360px]:text-base sm:text-lg font-black font-mono text-white mt-1">
              {stats.confirmedCount} <span className="text-[8px] text-zinc-500 font-bold uppercase ml-1">Ativos</span>
            </p>
          </div>

          {/* Unique Participants Card */}
          <div className="bg-[#050505]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[8px] sm:text-[9px] uppercase font-black text-zinc-400 tracking-wider">Participantes</span>
            <p className="text-sm min-[360px]:text-base sm:text-lg font-black font-mono text-white mt-1">
              {stats.uniquePhones} <span className="text-[8px] text-zinc-500 font-bold uppercase ml-1">Únicos</span>
            </p>
          </div>

          {/* Pending or General Stats Card */}
          <div className="bg-[#050505]/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[8px] sm:text-[9px] uppercase font-black text-zinc-400 tracking-wider">Aguardando PIX</span>
            <p className="text-sm min-[360px]:text-base sm:text-lg font-black font-mono text-white mt-1">
              {stats.pendingCount} <span className="text-[8px] text-zinc-500 font-bold uppercase ml-1">Pendentes</span>
            </p>
          </div>
        </div>

        {/* Competition quick stats bar */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3.5 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5 items-center justify-between text-[10px] text-zinc-400">
          <p className="flex items-center gap-1">
            <span className="text-zinc-500 font-bold">Média de palpites por jogo:</span>
            <span className="text-white font-extrabold font-mono">{stats.avgBetsPerGame}</span>
          </p>
          <p className="flex items-center gap-1">
            <span className="text-zinc-500 font-bold">Total cadastrado:</span>
            <span className="text-white font-extrabold font-mono">{stats.totalBets}</span>
            <span className="text-[8px] text-zinc-500">({stats.pendingCount} por confirmar)</span>
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="w-4 h-4 text-white/40" />
        </span>
        <input
          type="text"
          placeholder="Buscar participante, time ou autor do gol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#050505] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Filters HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-1">
        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1 leading-none">
            <Filter className="w-2.5 h-2.5 text-zinc-600" /> Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full bg-[#050505] border border-white/5 rounded-xl p-2 text-[10px] font-bold text-white/80 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os Palpites</option>
            <option value="confirmed">Apenas Confirmados 🟢</option>
            <option value="pending">Pendentes de PIX 🟡</option>
          </select>
        </div>

        {/* Game Filter */}
        <div className="space-y-1">
          <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1 leading-none">
            <Gamepad2 className="w-2.5 h-2.5 text-zinc-600" /> Partida
          </label>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="w-full bg-[#050505] border border-white/5 rounded-xl p-2 text-[10px] font-bold text-white/80 focus:outline-none focus:border-blue-500 truncate"
          >
            <option value="all">Todas as Partidas</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.homeTeam} x {g.awayTeam} {g.isActive ? " ⭐ (Ativo)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="space-y-1">
          <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1 leading-none">
            <ArrowUpDown className="w-2.5 h-2.5 text-zinc-600" /> Ordenação
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full bg-[#050505] border border-white/5 rounded-xl p-2 text-[10px] font-bold text-white/80 focus:outline-none focus:border-blue-500"
          >
            <option value="newest">Mais Recentes</option>
            <option value="oldest">Mais Antigos</option>
            <option value="name-asc">Nome (A - Z)</option>
            <option value="name-desc">Nome (Z - A)</option>
            <option value="game">Por Jogo</option>
          </select>
        </div>
      </div>

      {/* Bets Scroller List */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {filteredAndSortedBets.length > 0 ? (
          filteredAndSortedBets.map((bet) => {
            const game = gamesMap.get(bet.gameId);
            const isConfirmed = bet.status === "confirmed";

            return (
              <div
                key={bet.id}
                className="bg-[#050505]/60 hover:bg-[#050505]/90 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-150 space-y-3"
              >
                {/* Participant Row & Status */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center text-zinc-400">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-white leading-normal truncate max-w-[170px]">
                        {bet.userName}
                      </p>
                      <p className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5 shrink-0" />
                        {formatPhone(bet.userPhone)}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${
                      isConfirmed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {isConfirmed ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Confirmado
                      </>
                    ) : (
                      <>
                        <Clock className="w-2.5 h-2.5" />
                        Aguardando PIX
                      </>
                    )}
                  </span>
                </div>

                {/* Predict Info Card layout */}
                {game ? (
                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    {/* Game Matchup info */}
                    <div className="text-left flex flex-col justify-center">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                        Partida Escolhida
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                        <span>{getTeamFlag(game.homeTeam)}</span>
                        <span className="truncate max-w-[65px]">{game.homeTeam}</span>
                        <span className="text-white/30 text-[9px]">x</span>
                        <span>{getTeamFlag(game.awayTeam)}</span>
                        <span className="truncate max-w-[65px]">{game.awayTeam}</span>
                      </div>
                    </div>

                    {/* Guess specs info */}
                    <div className="text-right flex flex-col justify-center items-end">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                        Palpite do Placar
                      </span>
                      <span className="text-sm font-black text-blue-400 font-mono tracking-wide">
                        {bet.homePrediction} <span className="text-white/30 text-xs font-normal">×</span> {bet.awayPrediction}
                      </span>
                    </div>

                    {/* First Goal info */}
                    <div className="text-left col-span-2 bg-[#0a0a0a] border border-white/5 rounded-xl p-2.5 flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-[10px] text-zinc-400 font-medium">
                          Quem faz o 1º gol:
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-white tracking-wide uppercase">
                        {bet.firstGoalPrediction || "Ninguém / Não definido"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-rose-400 font-medium bg-rose-500/5 p-2 rounded-xl text-center">
                    Partida expirada ou não encontrada.
                  </p>
                )}

                {/* Footer specs of the card item */}
                <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1 select-all font-mono">
                    ID: {bet.id.toUpperCase().slice(-6)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-600" />
                    {new Date(bet.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 bg-[#050505]/40 border border-white/5 rounded-2xl">
            <span className="text-2xl">🔍</span>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
              Nenhum palpite correspondente
            </p>
            <p className="text-[10px] text-zinc-500 max-w-xs font-medium">
              Por favor, altere seu termo de busca ou filtros aplicados para encontrar os dados desejados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
