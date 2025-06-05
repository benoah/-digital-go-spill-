// server/socketServer.ts
import express from "express";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

import { BOARD_SIZE, processMove, Coordinate } from "../src/app/lib/goEngine";
import { query, testDbConnection } from "./lib/db";

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

interface Player {
  id: string;
  playerNumber: 1 | 2;
}

interface Game {
  id: string;
  players: Player[];
  boardState: number[][];
  currentPlayer: 1 | 2;
  status: "waiting_for_players" | "in_progress" | "finished" | "aborted";
  gameMessage: string;
  koPoint: Coordinate | null;
  boardStateBeforeOpponentMove?: number[][];
  capturedByBlack: number;
  capturedByWhite: number;
  consecutivePasses: number;
  isGameOver: boolean;
}

const createEmptyBoard = (): number[][] =>
  Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(0));

const parseDbGame = (dbRow: any): Game | null => {
  if (!dbRow) return null;
  try {
    return {
      id: dbRow.id,
      players: Array.isArray(dbRow.players)
        ? dbRow.players
        : JSON.parse(dbRow.players || "[]"),
      boardState: Array.isArray(dbRow.board_state)
        ? dbRow.board_state
        : JSON.parse(dbRow.board_state),
      currentPlayer: parseInt(dbRow.current_player, 10) as 1 | 2,
      status: dbRow.status,
      gameMessage: dbRow.game_message,
      koPoint: dbRow.ko_point
        ? typeof dbRow.ko_point === "string"
          ? JSON.parse(dbRow.ko_point)
          : dbRow.ko_point
        : null,
      boardStateBeforeOpponentMove: dbRow.board_state_before_opponent_move
        ? typeof dbRow.board_state_before_opponent_move === "string"
          ? JSON.parse(dbRow.board_state_before_opponent_move)
          : dbRow.board_state_before_opponent_move
        : undefined,
      capturedByBlack: parseInt(dbRow.captured_by_black, 10) || 0,
      capturedByWhite: parseInt(dbRow.captured_by_white, 10) || 0,
      consecutivePasses: parseInt(dbRow.consecutive_passes, 10) || 0,
      isGameOver: Boolean(dbRow.is_game_over),
    };
  } catch (e) {
    console.error(
      "[parseDbGame] Feil ved parsing av spillobjekt fra DB:",
      e,
      "\nRådata:",
      dbRow
    );
    return null;
  }
};

const buildClientGameState = (
  game: Game | null
): Omit<Game, "boardStateBeforeOpponentMove"> | null => {
  if (!game) return null;
  const { boardStateBeforeOpponentMove, ...clientState } = game;
  return clientState;
};

io.on("connection", (socket: Socket) => {
  console.log(`🔌 Ny bruker koblet til: ${socket.id}`);

  // I filen: server/socketServer.ts

  socket.on("joinGame", async (gameId: string) => {
    if (!gameId) {
      console.error(`[joinGame] Feilet for ${socket.id}: gameId mangler.`);
      socket.emit("error", { message: "gameId mangler for å joine spill." });
      return;
    }

    try {
      // Steg 1: Bli med i rommet og hent spillet fra databasen
      socket.join(gameId);
      socket.data.gameId = gameId;
      console.log(
        `[joinGame] Bruker ${socket.id} ble med i spillrom: ${gameId}`
      );

      const gameResult = await query("SELECT * FROM games WHERE id = $1", [
        gameId,
      ]);
      let game: Game | null = parseDbGame(gameResult.rows[0]);

      // Steg 2: Opprett spillet hvis det ikke finnes
      if (!game) {
        console.log(
          `[joinGame] Oppretter nytt spill for gameId: ${gameId} i DB.`
        );
        const newGameQuery = `
        INSERT INTO games (id, board_state, current_player, status, game_message, players)
        VALUES ($1, $2, 1, 'waiting_for_players', 'Venter på spillere...', '[]')
        RETURNING *;
      `;
        const newGameResult = await query(newGameQuery, [
          gameId,
          JSON.stringify(createEmptyBoard()),
        ]);
        game = parseDbGame(newGameResult.rows[0]);
      }

      if (!game) {
        // Hvis spillet fortsatt er null, har noe gått alvorlig galt.
        socket.emit("error", {
          message: "Klarte ikke hente eller opprette spill.",
        });
        return;
      }

      // Steg 3: Legg til den nye spilleren hvis det er plass og de ikke allerede er med
      const isAlreadyPlayer = game.players.some((p) => p.id === socket.id);
      if (!isAlreadyPlayer && game.players.length < 2) {
        const playerNumber = (game.players.length + 1) as 1 | 2;
        game.players.push({ id: socket.id, playerNumber });

        // Oppdater status og melding basert på antall spillere
        if (game.players.length === 1) {
          game.status = "waiting_for_players";
          game.gameMessage = "Venter på motstander...";
        } else if (game.players.length === 2) {
          game.status = "in_progress";
          game.gameMessage = "Spillet er i gang! Spiller Svart begynner.";
        }

        // Lagre den oppdaterte spillerlisten og statusen til databasen
        const updateQuery = `
        UPDATE games SET players = $1, status = $2, game_message = $3, updated_at = NOW()
        WHERE id = $4 RETURNING *;
      `;
        const updatedResult = await query(updateQuery, [
          JSON.stringify(game.players),
          game.status,
          game.gameMessage,
          gameId,
        ]);
        game = parseDbGame(updatedResult.rows[0]); // Hent den endelige, autoritative tilstanden
      }

      // Steg 4: Send den endelige, komplette spilltilstanden til ALLE i rommet
      if (game) {
        console.log(
          `[joinGame] Sender gameStateUpdate til rom ${gameId}. Spillere: ${game.players.length}, Status: ${game.status}`
        );
        io.to(gameId).emit("gameStateUpdate", buildClientGameState(game));
      }
    } catch (error) {
      console.error(
        `[joinGame] Databasefeil for ${gameId} (socket ${socket.id}):`,
        error
      );
      socket.emit("error", { message: "En serverfeil oppstod." });
    }
  });

  socket.on(
    "makeMove",
    async (data: { gameId: string; x: number; y: number }) => {
      const { gameId, x, y } = data;
      console.log(
        `[makeMove] Mottatt fra ${socket.id} for spill ${gameId}: (${x},${y})`
      );

      try {
        const gameResult = await query("SELECT * FROM games WHERE id = $1", [
          gameId,
        ]);
        if (gameResult.rows.length === 0) {
          /* ... feilhåndtering ... */ return;
        }
        let game = parseDbGame(gameResult.rows[0]);
        if (!game) {
          /* ... feilhåndtering ... */ return;
        }
        console.log(
          `[makeMove] Hentet spill ${gameId} fra DB. Status: ${game.status}, Nåværende spiller: ${game.currentPlayer}, ConsecutivePasses: ${game.consecutivePasses}`
        );

        const playerInfo = game.players.find((p: Player) => p.id === socket.id);
        if (!playerInfo) {
          /* ... feilhåndtering ... */ return;
        }
        if (playerInfo.playerNumber !== game.currentPlayer) {
          /* ... feilhåndtering ... */ return;
        }
        if (game.isGameOver || game.status !== "in_progress") {
          /* ... feilhåndtering ... */ return;
        }

        const boardStateForSuperKoCheck =
          game.boardStateBeforeOpponentMove || null;
        const moveResult = processMove(
          game.boardState,
          x,
          y,
          game.currentPlayer,
          game.koPoint,
          boardStateForSuperKoCheck
        );
        console.log(
          `[makeMove] processMove resultat for ${socket.id} i ${gameId}: `,
          moveResult
        );

        if (moveResult.isValid) {
          game.boardStateBeforeOpponentMove = game.boardState.map((row) => [
            ...row,
          ]);
          game.boardState = moveResult.newBoard;
          const previousPlayer = game.currentPlayer;
          game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
          game.koPoint = moveResult.nextKoPoint;
          game.consecutivePasses = 0;
          let message = `Spiller ${
            game.currentPlayer === 1 ? "Svart" : "Hvit"
          } sin tur.`;
          if (moveResult.message) message = `${moveResult.message} ${message}`;
          if (moveResult.capturedStonesCount > 0) {
            if (previousPlayer === 1)
              game.capturedByBlack += moveResult.capturedStonesCount;
            else game.capturedByWhite += moveResult.capturedStonesCount;
            message = `${moveResult.capturedStonesCount} stein(er) fanget! ${message}`;
          }
          game.gameMessage = message;

          const updateQuery = `
          UPDATE games 
          SET board_state = $1, current_player = $2, ko_point = $3, 
              captured_by_black = $4, captured_by_white = $5, 
              consecutive_passes = $6, game_message = $7, 
              board_state_before_opponent_move = $8, updated_at = NOW(), is_game_over = $10 
          WHERE id = $9
          RETURNING *; 
        `;
          const updatedGameResult = await query(updateQuery, [
            JSON.stringify(game.boardState),
            game.currentPlayer,
            game.koPoint ? JSON.stringify(game.koPoint) : null,
            game.capturedByBlack,
            game.capturedByWhite,
            game.consecutivePasses,
            game.gameMessage,
            game.boardStateBeforeOpponentMove
              ? JSON.stringify(game.boardStateBeforeOpponentMove)
              : null,
            gameId,
            game.isGameOver,
          ]);
          const updatedGame = parseDbGame(updatedGameResult.rows[0]);
          if (!updatedGame) {
            /* ... feilhåndtering ... */ return;
          }

          io.to(gameId).emit(
            "gameStateUpdate",
            buildClientGameState(updatedGame)
          );
        } else {
          socket.emit("invalidMove", {
            message: moveResult.message || "Ugyldig trekk.",
          });
        }
      } catch (error) {
        /* ... feilhåndtering ... */
      }
    }
  );

  socket.on("passTurn", async (gameId: string) => {
    console.log(`[passTurn] Mottatt fra ${socket.id} for spill ${gameId}`);
    try {
      const gameResult = await query("SELECT * FROM games WHERE id = $1", [
        gameId,
      ]);
      if (gameResult.rows.length === 0) {
        /* ... feilhåndtering ... */ return;
      }
      let game = parseDbGame(gameResult.rows[0]);
      if (!game) {
        /* ... feilhåndtering ... */ return;
      }
      console.log(
        `[passTurn] Hentet spill FØR pass. ConsecutivePasses: ${game.consecutivePasses}, IsGameOver: ${game.isGameOver}`
      );

      const playerInfo = game.players.find((p: Player) => p.id === socket.id);
      if (
        !playerInfo ||
        playerInfo.playerNumber !== game.currentPlayer ||
        game.isGameOver ||
        game.status !== "in_progress"
      ) {
        socket.emit("invalidMove", { message: "Kan ikke passe nå." });
        return;
      }

      const passingPlayerNumber = game.currentPlayer;
      game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
      game.consecutivePasses += 1;
      game.koPoint = null;
      game.boardStateBeforeOpponentMove = undefined;
      game.gameMessage = `Spiller ${
        passingPlayerNumber === 1 ? "Svart" : "Hvit"
      } passet. Spiller ${
        game.currentPlayer === 1 ? "Svart" : "Hvit"
      } sin tur.`;

      if (game.consecutivePasses >= 2) {
        game.isGameOver = true;
        game.status = "finished";
        game.gameMessage = "Spillet er slutt (to etterfølgende pass)!";
      } else {
        game.isGameOver = false;
      }

      const updateQuery = `
            UPDATE games 
            SET current_player = $1, consecutive_passes = $2, ko_point = $3, 
                is_game_over = $4, game_message = $5, status = $6, 
                board_state_before_opponent_move = $7, updated_at = NOW()
            WHERE id = $8
            RETURNING *;
        `;
      const updatedGameResult = await query(updateQuery, [
        game.currentPlayer,
        game.consecutivePasses,
        game.koPoint,
        game.isGameOver,
        game.gameMessage,
        game.status,
        game.boardStateBeforeOpponentMove
          ? JSON.stringify(game.boardStateBeforeOpponentMove)
          : null,
        gameId,
      ]);
      const updatedGame = parseDbGame(updatedGameResult.rows[0]);
      if (!updatedGame) {
        /* ... feilhåndtering ... */ return;
      }

      io.to(gameId).emit("gameStateUpdate", buildClientGameState(updatedGame));
    } catch (error) {
      /* ... feilhåndtering ... */
    }
  });

  socket.on("resetGame", async (gameId: string) => {
    console.log(`[resetGame] Mottatt fra ${socket.id} for spill ${gameId}`);
    try {
      const gamePlayersResult = await query(
        "SELECT players FROM games WHERE id = $1",
        [gameId]
      );
      if (gamePlayersResult.rows.length === 0) {
        /* ... feilhåndtering ... */ return;
      }
      const currentPlayers: Player[] = Array.isArray(
        gamePlayersResult.rows[0].players
      )
        ? gamePlayersResult.rows[0].players
        : JSON.parse(gamePlayersResult.rows[0].players || "[]");

      const initialBoardState = createEmptyBoard();
      const newCurrentPlayer = 1;
      const newGameMessage =
        currentPlayers.length === 2
          ? `Spillet er nullstilt! Spiller ${
              newCurrentPlayer === 1 ? "Svart" : "Hvit"
            } begynner.`
          : "Spillet er nullstilt. Venter på spillere...";
      const newStatus =
        currentPlayers.length === 2 ? "in_progress" : "waiting_for_players";

      const updateQuery = `
            UPDATE games 
            SET board_state = $1, current_player = $2, ko_point = $3, 
                captured_by_black = $4, captured_by_white = $5, 
                consecutive_passes = $6, is_game_over = $7, game_message = $8, 
                status = $9, board_state_before_opponent_move = $10, 
                players = $11, updated_at = NOW()
            WHERE id = $12 
            RETURNING *;
        `;
      const updatedGameResult = await query(updateQuery, [
        JSON.stringify(initialBoardState),
        newCurrentPlayer,
        null,
        0,
        0,
        0,
        false,
        newGameMessage,
        newStatus,
        null,
        JSON.stringify(currentPlayers),
        gameId,
      ]);
      const resetGame = parseDbGame(updatedGameResult.rows[0]);
      if (!resetGame) {
        /* ... feilhåndtering ... */ return;
      }

      io.to(gameId).emit("gameStateUpdate", buildClientGameState(resetGame));
    } catch (error) {
      /* ... feilhåndtering ... */
    }
  });

  socket.on(
    "sendChatMessage",
    async (data: { gameId: string; message: string }) => {
      const { gameId, message } = data;
      if (!gameId || !message || message.trim() === "") {
        /* ... feilhåndtering ... */ return;
      }
      console.log(
        `[sendChatMessage] Mottatt fra ${socket.id} for spill ${gameId}: "${message}"`
      );

      try {
        const gamePlayersResult = await query(
          "SELECT players FROM games WHERE id = $1",
          [gameId]
        );
        if (gamePlayersResult.rows.length === 0) {
          /* ... feilhåndtering ... */ return;
        }
        const players: Player[] = Array.isArray(
          gamePlayersResult.rows[0].players
        )
          ? gamePlayersResult.rows[0].players
          : [];

        const playerInfo = players.find((p: Player) => p.id === socket.id);
        const senderDisplayName = playerInfo
          ? `Spiller ${playerInfo.playerNumber}`
          : `Tilskuer (${socket.id.substring(0, 5)})`;

        const chatMessageData = {
          senderSocketId: socket.id,
          senderDisplayName: senderDisplayName,
          text: message.trim(),
          timestamp: new Date().toISOString(),
        };

        const insertChatQuery = `
            INSERT INTO chat_messages (game_id, sender_socket_id, sender_display_name, text, timestamp) 
            VALUES ($1, $2, $3, $4, $5) RETURNING message_id; 
        `;
        const dbResult = await query(insertChatQuery, [
          gameId,
          socket.id,
          senderDisplayName,
          chatMessageData.text,
          chatMessageData.timestamp,
        ]);

        if (dbResult.rowCount === 1) {
          io.to(gameId).emit("newChatMessage", chatMessageData);
        } else {
          /* ... feilhåndtering ... */
        }
      } catch (error) {
        /* ... feilhåndtering ... */
      }
    }
  );

  socket.on("disconnect", async () => {
    console.log(`🔌 Bruker ${socket.id} koblet fra.`);
    const gameId = socket.data.gameId; // Hent gameId som ble lagret på socketen

    if (!gameId) {
      console.log(
        `[disconnect] Socket ${socket.id} var ikke i et spesifikt spillrom (ingen gameId på socket.data).`
      );
      return; // Avslutt hvis vi ikke har en gameId å jobbe med for denne socketen
    }

    console.log(`[disconnect] Bruker ${socket.id} koblet fra spill ${gameId}.`);
    try {
      const gameResult = await query("SELECT * FROM games WHERE id = $1", [
        gameId,
      ]);
      if (gameResult.rows.length === 0) {
        console.log(
          `[disconnect] Spill ${gameId} ikke funnet i DB for bruker ${socket.id}.`
        );
        return;
      }

      let game = parseDbGame(gameResult.rows[0]);
      if (!game) {
        console.error(
          `[disconnect] Klarte ikke parse spill ${gameId} fra DB for bruker ${socket.id}.`
        );
        return;
      }

      const playerIndex = game.players.findIndex(
        (p: Player) => p.id === socket.id
      );
      if (playerIndex !== -1) {
        const disconnectedPlayer = game.players.splice(playerIndex, 1)[0];
        console.log(
          `[disconnect] Spiller ${disconnectedPlayer.playerNumber} (${socket.id}) fjernet fra players-array for spill ${gameId}.`
        );

        let gameMessage = `Spiller ${disconnectedPlayer.playerNumber} har forlatt spillet.`;
        if (game.status === "in_progress" && game.players.length < 2) {
          game.status = "waiting_for_players";
          gameMessage += " Spillet venter på en ny spiller.";
          // Nullstill relevant spillstatus når en spiller forlater et pågående spill
          game.currentPlayer = 1;
          game.consecutivePasses = 0;
          game.koPoint = null;
          game.boardStateBeforeOpponentMove = undefined;
          // Brettet kan beholdes som det var, eller nullstilles hvis ønskelig
        } else if (
          game.players.length === 0 &&
          (game.status === "waiting_for_players" ||
            game.status === "in_progress")
        ) {
          gameMessage = "Alle spillere har forlatt. Spillet er tomt.";
          game.status = "aborted"; // Eller 'waiting_for_players' hvis du vil at det skal kunne gjenopptas

          // eller la en bakgrunnsjobb rydde opp i "aborted" spill.
        }
        game.gameMessage = gameMessage;

        const updateQuery = `
                UPDATE games 
                SET players = $1, status = $2, game_message = $3, 
                    current_player = $4, consecutive_passes = $5, ko_point = $6, 
                    board_state_before_opponent_move = $7, 
                    updated_at = NOW()
                WHERE id = $8
                RETURNING *;
            `;
        const updatedGameAfterDisconnectResult = await query(updateQuery, [
          JSON.stringify(game.players),
          game.status,
          game.gameMessage,
          game.currentPlayer,
          game.consecutivePasses,
          game.koPoint ? JSON.stringify(game.koPoint) : null,
          game.boardStateBeforeOpponentMove
            ? JSON.stringify(game.boardStateBeforeOpponentMove)
            : null,
          gameId,
        ]);
        const updatedGame = parseDbGame(
          updatedGameAfterDisconnectResult.rows[0]
        );

        io.to(gameId).emit("playerLeft", {
          playerId: socket.id,
          playerNumber: disconnectedPlayer.playerNumber,
          message: game.gameMessage,
        });
        if (updatedGame) {
          io.to(gameId).emit(
            "gameStateUpdate",
            buildClientGameState(updatedGame)
          );
        }
        console.log(
          `[disconnect] Informert rom ${gameId} om at spiller ${disconnectedPlayer.playerNumber} forlot. Ny status: ${game.status}`
        );
      } else {
        console.log(
          `[disconnect] Bruker ${socket.id} var ikke registrert som spiller i ${gameId}. Ingen endring i players-array.`
        );
      }
    } catch (error) {
      console.error(
        `[disconnect] Databasefeil under håndtering av disconnect for ${socket.id} i spill ${gameId}:`,
        error
      );
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log("----------------------------------------------------");
  console.log(`🚀 Socket.IO server kjører på http://localhost:${PORT}`);
  console.log("----------------------------------------------------");
  console.log("   Venter på tilkoblinger fra klienter...");
  console.log("----------------------------------------------------");

  testDbConnection()
    .then((connected) => {
      if (connected) {
        console.log("✅ Databaseforbindelse ser ut til å fungere.");
      }
    })
    .catch((error) => {
      console.error(
        "❌ Uventet feil under testing av databaseforbindelse:",
        error
      );
    });
});
