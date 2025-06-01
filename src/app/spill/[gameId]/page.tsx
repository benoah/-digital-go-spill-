// src/app/spill/[gameId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { io, Socket as SocketClient } from "socket.io-client";
import { PopcornStyleGoLogo } from "@/app/components/home";

import type { Coordinate } from "../../lib/goEngine";
import { BOARD_SIZE as ENGINE_BOARD_SIZE } from "../../lib/goEngine";

import type { GoBoard3DProps } from "../components/GoBoard3D";
import { motion } from "framer-motion";

interface GamePlayer {
  id: string;
  playerNumber: 1 | 2;
}
interface GameState {
  id: string;
  boardState: number[][];
  currentPlayer: 1 | 2;
  koPoint: Coordinate | null;
  capturedByBlack: number;
  capturedByWhite: number;
  consecutivePasses: number;
  isGameOver: boolean;
  players: GamePlayer[];
  gameMessage: string;
  status: string;
}

const GameBoard3DWithNoSSR = dynamic<GoBoard3DProps>(
  () => import("../components/GoBoard3D").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          minHeight: "300px",
          aspectRatio: "1 / 1",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "1px dashed #4A5568",
          margin: "1rem 0",
          borderRadius: "8px",
          backgroundColor: "rgba(42, 42, 42, 0.1)",
        }}
      >
        <p style={{ color: "#9CA3AF" }}>Laster spillbrett...</p>
      </div>
    ),
  }
);

const createEmptyBoard = (): number[][] =>
  Array(ENGINE_BOARD_SIZE)
    .fill(null)
    .map(() => Array(ENGINE_BOARD_SIZE).fill(0));

interface ChatMessage {
  senderDisplayName: string;
  text: string;
  senderSocketId?: string;
  timestamp?: string;
}

export default function SpillPage() {
  const params = useParams();
  const gameId = typeof params.gameId === "string" ? params.gameId : null;

  const [isClient, setIsClient] = useState(false);
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const consecutivePassesRef = useRef(0); // Fixed: Using ref instead of variable

  const [boardState, setBoardState] = useState<number[][]>(createEmptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [gameMessage, setGameMessage] = useState<string>(
    gameId ? "Kobler til spill..." : "Mangler spill-ID."
  );
  const [koPoint, setKoPoint] = useState<Coordinate | null>(null);
  const [capturedByBlack, setCapturedByBlack] = useState<number>(0);
  const [capturedByWhite, setCapturedByWhite] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [playersInGame, setPlayersInGame] = useState<GamePlayer[]>([]);
  const [isSpectator, setIsSpectator] = useState<boolean>(true);

  useEffect(() => {
    setIsClient(true);
    document.documentElement.classList.add("dark");

    if (!gameId) {
      console.error("Mangler gameId, kan ikke koble til socket.");
      setGameMessage("Feil: Spill-ID mangler i URL.");
      return;
    }

    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3001"
    );
    setSocket(newSocket);

    return () => {
      console.log("Kobler fra socket ved demontering av SpillPage");
      newSocket.disconnect();
    };
  }, [gameId]);

  useEffect(() => {
    if (!socket || !gameId) return;

    socket.emit("joinGame", gameId);
    console.log(`Forsøker å joine spill: ${gameId}`);

    socket.on("connect", () => {
      console.log("Koblet til socket server med ID:", socket.id);
    });

    socket.on("gameStateUpdate", (updatedGame: GameState) => {
      console.log("Mottok gameStateUpdate:", updatedGame);
      if (updatedGame) {
        setBoardState(updatedGame.boardState);
        setCurrentPlayer(updatedGame.currentPlayer);
        setGameMessage(updatedGame.gameMessage);
        setKoPoint(updatedGame.koPoint);
        setCapturedByBlack(updatedGame.capturedByBlack);
        setCapturedByWhite(updatedGame.capturedByWhite);
        consecutivePassesRef.current = updatedGame.consecutivePasses; // Fixed: Store in ref
        setGameOver(updatedGame.isGameOver);
        setPlayersInGame(updatedGame.players || []);

        const amIPlayer = updatedGame.players.some((p) => p.id === socket.id);
        setIsSpectator(!amIPlayer);
        console.log(amIPlayer ? "Bruker er spiller." : "Bruker er tilskuer.");
      }
    });

    socket.on(
      "playerUpdate",
      (data: { players: GamePlayer[]; message: string }) => {
        console.log("Mottok playerUpdate:", data);
        setPlayersInGame(data.players || []);
        setGameMessage(data.message);
        if (socket?.id) {
          const amIPlayer = (data.players || []).some(
            (p) => p.id === socket.id
          );
          setIsSpectator(!amIPlayer);
        }
      }
    );

    socket.on(
      "gameReady",
      (data: { message: string; gameState: GameState }) => {
        console.log("Mottok gameReady:", data);
        setGameMessage(data.message);
      }
    );

    socket.on(
      "playerLeft",
      (data: {
        playerId: string;
        playerNumber: 1 | 2;
        message: string;
        updatedGameState: GameState;
      }) => {
        console.log("Mottok playerLeft:", data);
        setGameMessage(data.message);
        if (data.updatedGameState) {
          setBoardState(data.updatedGameState.boardState);
          setCurrentPlayer(data.updatedGameState.currentPlayer);
          setKoPoint(data.updatedGameState.koPoint);
          setPlayersInGame(data.updatedGameState.players || []);
          setGameOver(data.updatedGameState.isGameOver);
          if (socket?.id) {
            const amIPlayer = (data.updatedGameState.players || []).some(
              (p) => p.id === socket.id
            );
            setIsSpectator(!amIPlayer);
          }
        }
      }
    );

    socket.on("updateMessage", (data: { message: string }) => {
      console.log("Mottok updateMessage:", data);
      setGameMessage(data.message);
    });

    socket.on("newChatMessage", (messageData: ChatMessage) => {
      console.log("Mottok newChatMessage:", messageData);
      setChatMessages((prevMessages) => [...prevMessages, messageData]);
    });

    socket.on("error", (errorData: { message: string }) => {
      console.error("Socket error:", errorData.message);
      setGameMessage(`Feil: ${errorData.message}`);
    });

    socket.on("invalidMove", (errorData: { message: string }) => {
      console.warn("Invalid move:", errorData.message);
      setGameMessage(errorData.message);
    });

    return () => {
      socket.off("connect");
      socket.off("gameStateUpdate");
      socket.off("playerUpdate");
      socket.off("gameReady");
      socket.off("playerLeft");
      socket.off("updateMessage");
      socket.off("newChatMessage");
      socket.off("error");
      socket.off("invalidMove");
    };
  }, [socket, gameId]);

  const handleMakeMove = useCallback(
    (x: number, y: number) => {
      if (gameOver || !socket || isSpectator) return;
      console.log(`Sender makeMove: (${x}, ${y}) for game ${gameId}`);
      socket.emit("makeMove", { gameId, x, y });
    },
    [socket, gameId, gameOver, isSpectator]
  );

  const handlePassTurn = useCallback(() => {
    if (gameOver || !socket || isSpectator) return;
    console.log(`Sender passTurn for game ${gameId}`);
    socket.emit("passTurn", gameId);
  }, [socket, gameId, gameOver, isSpectator]);

  const handleResetGame = useCallback(() => {
    if (!socket || isSpectator) return;
    console.log(`Sender resetGame for game ${gameId}`);
    socket.emit("resetGame", gameId);
    setChatMessages([]);
  }, [socket, gameId, isSpectator]);

  const handleSendChat = useCallback(() => {
    if (chatInput.trim() === "" || !socket) return;
    console.log(
      `Sender sendChatMessage: "${chatInput.trim()}" for game ${gameId}`
    );
    socket.emit("sendChatMessage", { gameId, message: chatInput.trim() });
    setChatInput("");
  }, [socket, gameId, chatInput]);

  if (!isClient || !gameId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900">
        <p className="text-lg text-slate-300">
          {gameId ? "Laster spill..." : "Mangler spill-ID i URL."}
        </p>
      </div>
    );
  }

  const gameMessageColor = gameOver
    ? "#4ADE80"
    : gameMessage.toLowerCase().includes("ugyldig") ||
      gameMessage.toLowerCase().includes("feil") ||
      gameMessage.toLowerCase().includes("error")
    ? "#F87171"
    : "#CBD5E1";

  const canPlay = !gameOver && !isSpectator && socket;

  return (
    <motion.div
      className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.main
        className="flex flex-col items-center mb-4 w-full max-w-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <PopcornStyleGoLogo />

        <div className="text-center mt-3 mb-5 p-4 bg-slate-700/40 dark:bg-slate-800/50 backdrop-blur-md rounded-lg shadow-lg w-full">
          <motion.p
            key={`player-${currentPlayer}-${gameOver}`}
            className="text-xl font-semibold text-slate-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {gameOver
              ? "Spillet er slutt"
              : `Spiller ${currentPlayer === 1 ? "Svart" : "Hvit"} sin tur`}
            {isSpectator && !gameOver && " (Du ser på)"}
          </motion.p>
          {koPoint && !gameOver && (
            <motion.p
              className="text-sm italic text-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              (Ko på: x={koPoint.x}, y={koPoint.y})
            </motion.p>
          )}
          <motion.p className="text-base mt-1 text-slate-200">
            Svart fangede: {capturedByBlack} | Hvit fangede: {capturedByWhite}
          </motion.p>
          <div className="mt-2 text-xs text-slate-400">
            Spillere i rommet: {playersInGame.length} / 2
            {playersInGame.map((p) => (
              <span
                key={p.id}
                className={`ml-2 p-1 rounded text-xs ${
                  p.id === socket?.id
                    ? "bg-sky-600 text-white font-semibold"
                    : "bg-slate-600 text-slate-300"
                }`}
              >
                Spiller {p.playerNumber}{" "}
                {p.id === socket?.id ? "(Deg)" : `(${p.id.substring(0, 5)})`}
              </span>
            ))}
          </div>
        </div>
      </motion.main>

      {gameMessage && (
        <motion.p
          key={gameMessage}
          className="text-center mb-3 sm:mb-4 italic font-medium min-h-[1.5em] text-lg"
          style={{ color: gameMessageColor }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {gameMessage}
        </motion.p>
      )}

      <motion.div
        className="w-full max-w-[500px] aspect-square mb-4 sm:mb-6 shadow-xl rounded-lg overflow-hidden"
        style={{
          opacity: gameOver ? 0.6 : 1,
          pointerEvents: canPlay ? "auto" : "none",
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isClient && (
          <GameBoard3DWithNoSSR
            initialBoardState={boardState}
            onMakeMove={canPlay ? handleMakeMove : undefined}
            currentPlayer={currentPlayer}
          />
        )}
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8 w-full max-w-md sm:max-w-sm">
        <motion.button
          onClick={handlePassTurn}
          disabled={!canPlay}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold inline-flex items-center justify-center
            text-sm uppercase tracking-wider
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            bg-slate-700 text-slate-100 border border-slate-600 
            shadow-md hover:shadow-lg focus-visible:ring-sky-500
            transition-all duration-150 ease-out
            ${
              !canPlay
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-slate-600 active:bg-slate-800 active:scale-95 active:translate-y-px"
            }
          `}
        >
          Pass
        </motion.button>
        <motion.button
          onClick={handleResetGame}
          disabled={!socket || isSpectator}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold inline-flex items-center justify-center
            text-sm uppercase tracking-wider
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            bg-sky-600 text-white border border-sky-700
            shadow-md hover:shadow-lg focus-visible:ring-sky-400
            transition-all duration-150 ease-out
            ${
              !socket || isSpectator
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-sky-500 active:bg-sky-700 active:scale-95 active:translate-y-px"
            }
          `}
        >
          Nullstill Spill
        </motion.button>
      </div>

      <motion.div
        className="w-full max-w-lg mt-4 mb-6 p-4 bg-slate-700/40 dark:bg-slate-800/50 backdrop-blur-md rounded-lg shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-xl font-semibold text-slate-100 mb-3 text-center">
          Chat
        </h3>
        <div className="h-40 sm:h-48 overflow-y-auto border border-slate-600/70 rounded-md p-3 mb-3 bg-slate-800/60 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
          {chatMessages.map((msg, index) => (
            <div key={index} className="mb-1.5 text-sm break-words">
              <strong
                style={{
                  color:
                    msg.senderSocketId === socket?.id ? "#60A5FA" : "#6EE7B7",
                }}
              >
                {msg.senderDisplayName}:
              </strong>{" "}
              <span className="text-slate-200">{msg.text}</span>
            </div>
          ))}
          {chatMessages.length === 0 && (
            <p className="text-slate-400 italic text-center py-4">
              Ingen meldinger ennå...
            </p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Skriv melding..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim() !== "")
                handleSendChat();
            }}
            disabled={!socket}
            className="flex-grow p-2.5 rounded-md border border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendChat}
            disabled={!socket || chatInput.trim() === ""}
            className={`
              py-2.5 px-5 rounded-md font-semibold text-sm
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
              transition-all duration-150 ease-out
              ${
                !socket || chatInput.trim() === ""
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed opacity-70 border border-slate-500"
                  : "bg-sky-600 text-white border border-sky-700 hover:bg-sky-500 active:bg-sky-700 active:scale-95"
              }
            `}
          >
            Send
          </button>
        </div>
      </motion.div>

      <div className="mt-auto pt-6 sm:pt-8">
        <Link
          href="/"
          className="text-slate-300 hover:text-sky-400 px-4 py-2 rounded-md 
                     hover:bg-slate-700/60 transition-colors text-base font-medium"
        >
          Tilbake til forsiden
        </Link>
      </div>
    </motion.div>
  );
}
