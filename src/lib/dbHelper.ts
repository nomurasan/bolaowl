import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { Game, Bet, Setting, ParticipantScore } from "../types";

// Lógica de cálculo da pontuação
export function calculatePointsForBet(
  homePrediction: number,
  awayPrediction: number,
  firstGoalPrediction: string,
  homeScore: number,
  awayScore: number,
  firstGoalScorer: string
): number {
  let points = 0;

  // Placar Exato: 10 pontos
  if (homePrediction === homeScore && awayPrediction === awayScore) {
    points = 10;
  } else {
    // Vencedor ou Empate
    const predictedWinner =
      homePrediction > awayPrediction ? "home" : homePrediction < awayPrediction ? "away" : "draw";
    const actualWinner =
      homeScore > awayScore ? "home" : homeScore < awayScore ? "away" : "draw";

    if (predictedWinner === actualWinner) {
      const predictedDiff = homePrediction - awayPrediction;
      const actualDiff = homeScore - awayScore;

      // Vencedor + Saldo de Gols: 7 pontos
      if (predictedDiff === actualDiff) {
        points = 7;
      } else {
        // Vencedor / Empate apenas: 5 pontos
        points = 5;
      }
    }
  }

  // Bônus 1º Gol: +3 pontos
  if (
    firstGoalScorer &&
    firstGoalPrediction &&
    firstGoalPrediction.trim().toLowerCase() === firstGoalScorer.trim().toLowerCase()
  ) {
    points += 3;
  }

  return points;
}

// Seeding inicial de jogos caso o banco esteja vazio
export const DEFAULT_GAMES: Omit<Game, "id">[] = [
  {
    homeTeam: "Brasil",
    awayTeam: "Haiti",
    date: "19 de junho, sexta-feira",
    time: "21h30",
    location: "Lincoln Financial Field, Filadélfia",
    gameTimestamp: new Date("2026-06-19T21:30:00").getTime(),
    isActive: true,
    createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
  },
  {
    homeTeam: "Escócia",
    awayTeam: "Brasil",
    date: "24 de junho, quarta-feira",
    time: "19h00",
    location: "Hard Rock Stadium, Miami",
    gameTimestamp: new Date("2026-06-24T19:00:00").getTime(),
    isActive: true,
    createdAt: Date.now(),
  },
];

export const DEFAULT_SETTINGS: Setting = {
  pixKey: "61986267773",
  pixReceiver: "Glaucia Leles - Banco Itaú",
  adminPhone: "556186267773",
  entryFee: 10,
  pixCopiaCola: "",
  qrCodeUrl: "",
  logoUrl: "",
  headerColor: "#F4F4F4",
  headerTextColor: "#1e293b",
  backgroundColor: "#4E94D8",
};

// Seeding executado na inicialização
export async function seedDatabaseIfNeeded() {
  try {
    // 1. Seed Settings
    const settingRef = doc(db, "settings", "pix");
    const settingSnap = await getDoc(settingRef);
    if (!settingSnap.exists()) {
      await setDoc(settingRef, DEFAULT_SETTINGS);
    } else {
      const currentData = settingSnap.data() as Setting;
      if (
        !currentData ||
        currentData.pixKey !== DEFAULT_SETTINGS.pixKey ||
        currentData.pixReceiver !== DEFAULT_SETTINGS.pixReceiver ||
        !currentData.adminPhone
      ) {
        await setDoc(settingRef, {
          ...DEFAULT_SETTINGS,
          ...currentData,
          // Guarantee there's at least some adminPhone if missing
          adminPhone: currentData.adminPhone || DEFAULT_SETTINGS.adminPhone,
        }, { merge: true });
      }
    }

    // 2. Obter todas as partidas existentes
    const gamesSnap = await getDocs(collection(db, "games"));
    const allGames: Game[] = [];
    gamesSnap.forEach((docSnap) => {
      allGames.push({ ...docSnap.data(), id: docSnap.id } as Game);
    });

    if (allGames.length === 0) {
      // Se não houver jogos, fazemos o seed usando IDs determinísticos para prevenir duplicidade concorrente
      for (const game of DEFAULT_GAMES) {
        const gameDocId = `${game.homeTeam.toLowerCase().trim().replace(/\s+/g, "-")}-vs-${game.awayTeam.toLowerCase().trim().replace(/\s+/g, "-")}`;
        const gameRef = doc(db, "games", gameDocId);
        await setDoc(gameRef, {
          ...game,
          id: gameDocId,
        });
      }
    } else {
      // Se houver jogos, verificamos e removemos duplicados ativos/inativos que possuam os mesmos times
      const groups: Record<string, Game[]> = {};
      allGames.forEach((game) => {
        const key = `${game.homeTeam.trim().toLowerCase()}_vs_${game.awayTeam.trim().toLowerCase()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(game);
      });

      for (const key of Object.keys(groups)) {
        const list = groups[key];
        if (list.length > 1) {
          // Ordenar por data de criação (manter o mais antigo)
          list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          const keptGame = list[0];
          const duplicates = list.slice(1);

          console.log(`[Deduplicador] Grupo de jogo duplicado encontrado para '${key}': mantendo ${keptGame.id}, removendo ${duplicates.map(d => d.id).join(", ")}`);

          for (const dup of duplicates) {
            // Migrar palpites associados ao jogo duplicado para o jogo principal (evita perda de dados)
            const betsQuery = query(collection(db, "bets"), where("gameId", "==", dup.id));
            const betsSnap = await getDocs(betsQuery);
            
            if (!betsSnap.empty) {
              const batch = writeBatch(db);
              betsSnap.forEach((betDoc) => {
                batch.update(betDoc.ref, { gameId: keptGame.id });
              });
              await batch.commit();
              console.log(`[Deduplicador] Migrados ${betsSnap.size} palpites de ${dup.id} para ${keptGame.id}`);
            }

            // Excluir documento de jogo duplicado
            await deleteDoc(doc(db, "games", dup.id));
            console.log(`[Deduplicador] Jogo duplicado ${dup.id} removido com sucesso.`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Erro no seeding ou deduplicação automatizada do banco:", error);
  }
}

// CRUD Jogos
export async function fetchGames(): Promise<Game[]> {
  const path = "games";
  try {
    const snap = await getDocs(query(collection(db, path), orderBy("createdAt", "asc")));
    return snap.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    })) as Game[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addGame(gameData: Omit<Game, "id" | "createdAt">): Promise<string> {
  const path = "games";
  try {
    // Somente um jogo pode estar ativo, caso tenha mais de um jogo cadastrado no sistema.
    if (gameData.isActive) {
      const q = query(collection(db, "games"), where("isActive", "==", true));
      const snap = await getDocs(q);
      const batchPromises = snap.docs.map(docSnap => 
        updateDoc(doc(db, "games", docSnap.id), { isActive: false })
      );
      await Promise.all(batchPromises);
    }

    const docRef = doc(collection(db, path));
    const newGame: Game = {
      ...gameData,
      id: docRef.id,
      rateioRealizado: false,
      createdAt: Date.now(),
    };
    await setDoc(docRef, newGame);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return "";
  }
}

export async function updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
  const path = `games/${gameId}`;
  try {
    // Somente um jogo pode estar ativo, caso tenha mais de um jogo cadastrado no sistema.
    if (updates.isActive === true) {
      const q = query(collection(db, "games"), where("isActive", "==", true));
      const snap = await getDocs(q);
      const batchPromises = snap.docs
        .filter(docSnap => docSnap.id !== gameId)
        .map(docSnap => 
          updateDoc(doc(db, "games", docSnap.id), { isActive: false })
        );
      await Promise.all(batchPromises);
    }

    const gameRef = doc(db, "games", gameId);
    await updateDoc(gameRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGame(gameId: string): Promise<void> {
  const path = `games/${gameId}`;
  try {
    const gameRef = doc(db, "games", gameId);
    await deleteDoc(gameRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// CRUD Palpites (Bets)
export async function addBet(betData: Omit<Bet, "id" | "status" | "calculatedPoints" | "createdAt">): Promise<string> {
  const path = "bets";
  try {
    const docRef = doc(collection(db, path));
    const newBet: Bet = {
      ...betData,
      id: docRef.id,
      status: "pending",
      calculatedPoints: null,
      createdAt: Date.now(),
    };
    await setDoc(docRef, newBet);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return "";
  }
}

export async function fetchBets(): Promise<Bet[]> {
  const path = "bets";
  try {
    const snap = await getDocs(query(collection(db, path), orderBy("createdAt", "desc")));
    return snap.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    })) as Bet[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateBet(betId: string, updates: Partial<Bet>): Promise<void> {
  const path = `bets/${betId}`;
  try {
    const betRef = doc(db, "bets", betId);
    await updateDoc(betRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBet(betId: string): Promise<void> {
  const path = `bets/${betId}`;
  try {
    const betRef = doc(db, "bets", betId);
    await deleteDoc(betRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Configurações PIX
export async function getSettings(): Promise<Setting> {
  const path = "settings/pix";
  try {
    const snap = await getDoc(doc(db, "settings", "pix"));
    if (snap.exists()) {
      return snap.data() as Setting;
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Setting): Promise<void> {
  const path = "settings/pix";
  try {
    await setDoc(doc(db, "settings", "pix"), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Calcular pontos de todos os palpites para um jogo quando o placar final for inserido/atualizado
export async function recomputePointsForGame(game: Game): Promise<void> {
  if (game.homeScore === null || game.homeScore === undefined || game.awayScore === null || game.awayScore === undefined) {
    return;
  }

  const path = "bets";
  try {
    // Obter palpites deste jogo específico
    const betsQuery = query(collection(db, "bets"), where("gameId", "==", game.id));
    const querySnapshot = await getDocs(betsQuery);

    const batch = writeBatch(db);

    querySnapshot.docs.forEach((docSnap) => {
      const bet = docSnap.data() as Bet;
      const points = calculatePointsForBet(
        bet.homePrediction,
        bet.awayPrediction,
        bet.firstGoalPrediction,
        game.homeScore!,
        game.awayScore!,
        game.firstGoalScorer || "Ninguém"
      );

      batch.update(docSnap.ref, {
        calculatedPoints: points,
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Resetar o resultado de uma partida e os pontos das apostas relacionadas
export async function resetGameAndPoints(gameId: string): Promise<void> {
  const path = "games";
  try {
    // 1. Resetar placar do jogo
    const gameRef = doc(db, "games", gameId);
    await updateDoc(gameRef, {
      homeScore: null,
      awayScore: null,
      firstGoalScorer: null,
    });

    // 2. Zerar pontos das apostas associadas a este jogo (definir como null)
    const betsQuery = query(collection(db, "bets"), where("gameId", "==", gameId));
    const querySnapshot = await getDocs(betsQuery);

    const batch = writeBatch(db);
    querySnapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        calculatedPoints: null,
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Calcular Ranking (Scoreboard) dos Participantes
export async function calculateRanking(bets: Bet[]): Promise<ParticipantScore[]> {
  if (!bets || !Array.isArray(bets)) return [];

  // Apenas apostas confirmadas somam pontos
  const confirmedBets = bets.filter((b) => b && b.status === "confirmed" && b.calculatedPoints !== null && b.calculatedPoints !== undefined);

  const scoresMap = new Map<string, { userName: string; totalPoints: number; exactScoresCount: number; confirmedCount: number }>();

  confirmedBets.forEach((bet) => {
    const rawPhone = bet.userPhone || "";
    const rawName = bet.userName || "Anônimo";
    
    // Agrupar por telefone + nome para evitar colisão caso pessoas tenham nomes iguais
    const key = `${rawPhone.trim()}_${rawName.trim().toLowerCase()}`;
    const points = bet.calculatedPoints || 0;
    const isExact = points >= 10; // Placar exato dá pelo menos 10 pontos

    const existingScore = scoresMap.get(key);
    if (existingScore) {
      existingScore.totalPoints += points;
      existingScore.confirmedCount += 1;
      if (isExact) {
        existingScore.exactScoresCount += 1;
      }
    } else {
      scoresMap.set(key, {
        userName: rawName,
        totalPoints: points,
        exactScoresCount: isExact ? 1 : 0,
        confirmedCount: 1,
      });
    }
  });

  const participants: ParticipantScore[] = Array.from(scoresMap.entries()).map(([key, data]) => {
    // Extrai o telefone da chave
    const parts = key.split("_");
    const phone = parts[0] || "";
    return {
      userName: data.userName,
      userPhone: phone,
      totalPoints: data.totalPoints,
      exactScoresCount: data.exactScoresCount,
      confirmedBetsCount: data.confirmedCount,
    };
  });

  // Ordenar decrescente por Pontos Acumulados.
  // Critério de desempate:
  // 1. Maior número de placares exatos acertados
  // 2. Maior número de palpites confirmados
  // 3. Ordem alfabética do nome do participante
  return participants.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.exactScoresCount !== a.exactScoresCount) {
      return b.exactScoresCount - a.exactScoresCount;
    }
    if (b.confirmedBetsCount !== a.confirmedBetsCount) {
      return b.confirmedBetsCount - a.confirmedBetsCount;
    }
    return (a.userName || "").localeCompare(b.userName || "");
  });
}

// Checar conformidade do palpite para evitar duplicidade de palpite, de comprovante ou de transação PIX
export async function checkBetCompliance(
  userPhone: string,
  gameId: string,
  txId: string | null,
  receiptHash: string | null,
  currentBetId: string
): Promise<{ compliant: boolean; reason?: string }> {
  try {
    const cleanPhone = userPhone.replace(/\D/g, "");

    // 1. Checar se o usuário já possui até 2 palpites cadastrados (confirmados ou aguardando) para esse jogo
    const qPhone = query(
      collection(db, "bets"),
      where("userPhone", "==", cleanPhone),
      where("gameId", "==", gameId)
    );
    const snapPhone = await getDocs(qPhone);
    const existingCountForThisGame = snapPhone.docs.filter(d => d.id !== currentBetId).length;
    if (existingCountForThisGame >= 2) {
      return {
        compliant: false,
        reason: "Você já possui 2 palpites cadastrados para esta partida (com pagamento confirmado ou aguardando validação do PIX). Cada participante só pode registrar até 2 palpites por jogo."
      };
    }

    // 2. Checar se a imagem do comprovante já foi utilizada (duplicidade por hash da imagem)
    if (receiptHash) {
      const qHash = query(
        collection(db, "bets"),
        where("status", "==", "confirmed"),
        where("receiptHash", "==", receiptHash)
      );
      const snapHash = await getDocs(qHash);
      const isReceiptImageReused = snapHash.docs.some(d => d.id !== currentBetId);
      if (isReceiptImageReused) {
        return {
          compliant: false,
          reason: "Esta mesma imagem de comprovante de pagamento já foi utilizada anteriormente para confirmar um palpite ativo."
        };
      }
    }

    // 3. Checar se o ID de Transação (txId) do PIX extraído já existe para outro palpite confirmado
    if (txId && txId.trim().length > 0) {
      const qTx = query(
        collection(db, "bets"),
        where("status", "==", "confirmed"),
        where("txId", "==", txId.trim())
      );
      const snapTx = await getDocs(qTx);
      const isTxIdReused = snapTx.docs.some(d => d.id !== currentBetId);
      if (isTxIdReused) {
        return {
          compliant: false,
          reason: `Esta transação de pagamento (ID: ${txId}) já foi validada e utilizada em outro palpite cadastrado.`
        };
      }
    }

    return { compliant: true };
  } catch (error) {
    console.error("Erro na verificação de conformidade do palpite:", error);
    return {
      compliant: false,
      reason: "Houve um erro de comunicação ao validar a conformidade da sua aposta. Por favor, tente novamente."
    };
  }
}

