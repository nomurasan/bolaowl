export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  location: string;
  gameTimestamp: number; // For countdown timers (milliseconds timestamp)
  homeScore?: number | null;
  awayScore?: number | null;
  firstGoalScorer?: string | null; // e.g. "Brasil", "Haiti", "Ninguém"
  isActive: boolean;
  rateioRealizado?: boolean;
  createdAt: number;
}

export interface Bet {
  id: string;
  userName: string;
  userPhone: string;
  gameId: string;
  homePrediction: number;
  awayPrediction: number;
  firstGoalPrediction: string; // "Brasil", "Haiti" (or same as awayTeam), or "Ninguém"
  status: "pending" | "confirmed";
  calculatedPoints: number | null;
  createdAt: number;
  txId?: string | null;
  receiptHash?: string | null;
  receiptMimeType?: string | null;
  receiptBase64?: string | null;
  receiptFileName?: string | null;
  receiptSize?: number | null;
}

export interface Setting {
  pixKey: string;
  pixReceiver: string;
  adminPhone?: string;
  entryFee?: number;
  pixCopiaCola?: string;
  qrCodeUrl?: string;
}

export interface ParticipantScore {
  userName: string;
  userPhone: string;
  totalPoints: number;
  exactScoresCount: number; // For tie-breaking
  confirmedBetsCount: number;
}
