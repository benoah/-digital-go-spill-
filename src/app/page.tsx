// src/app/page.tsx
"use client";
import { useRouter } from "next/navigation";
import {
  PopcornStyleGoLogo,
  PlayIcon,
  Slogan,
  StyledButton,
} from "./components/home";

import { useCallback, useEffect, useState } from "react"; // Importer useCallback
import { motion } from "framer-motion";
import { useThemeManager } from "./hooks/useThemeManager";
import { API_ROUTES } from "./constants/apiRoutes";
import { ActiveGamesSection } from "./components/home/ActiveGamesSection";
import type { GameInfo } from "./types"; // Antar GameInfo er definert i src/app/types.ts

export default function Home() {
  const { isThemeReady } = useThemeManager();
  const router = useRouter();
  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [activeGames, setActiveGames] = useState<GameInfo[]>([]);
  const [isLoadingActiveGames, setIsLoadingActiveGames] = useState(true);
  const [errorActiveGames, setErrorActiveGames] = useState<string | null>(null);

  //funksjon for å hente aktive spill fra API-et
  const fetchActiveGames = useCallback(async () => {
    setIsLoadingActiveGames(true);
    setErrorActiveGames(null);
    try {
      const response = await fetch(API_ROUTES.ACTIVE_GAMES);
      if (!response.ok) {
        // Prøv å parse JSON-feil, ellers bruk status
        const errorData = await response.json().catch(() => ({
          message: `Feil: ${response.status} - ${response.statusText}`,
        }));
        throw new Error(
          errorData.message ||
            `Feil: ${response.status} - ${response.statusText}`
        );
      }
      const gamesFromApi: GameInfo[] = await response.json();
      setActiveGames(gamesFromApi);
    } catch (err) {
      console.error("Feil ved henting av aktive spill:", err);
      setErrorActiveGames(
        err instanceof Error
          ? err.message
          : "En ukjent feil oppstod under henting av spill."
      );
      setActiveGames([]);
    } finally {
      setIsLoadingActiveGames(false);
    }
  }, []);

  useEffect(() => {
    if (isThemeReady) {
      fetchActiveGames();
    }
  }, [isThemeReady, fetchActiveGames]);

  const handleStartNewGame = () => {
    setIsLoadingGame(true);
    // TODO: Bytt ut med kall til API_ROUTES.CREATE_GAME når backend er klar
    const tempGameId = `dev-game-${Math.random().toString(36).substring(2, 9)}`;
    router.push(`/spill/${tempGameId}`); // TODO: Bruk rute-konstant
  };

  if (!isThemeReady) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900">
        <p className="text-lg text-slate-300">Laster tema...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 md:p-16 text-center">
        <motion.main
          className="flex flex-col gap-8 items-center w-full max-w-xl md:max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <PopcornStyleGoLogo />
          <Slogan />

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mt-4">
            <StyledButton
              as="button"
              onClick={handleStartNewGame}
              variant="primary"
              className="w-full sm:w-auto flex-grow"
              disabled={isLoadingGame}
            >
              <span className="mr-2">
                <PlayIcon />
              </span>
              {isLoadingGame ? "Oppretter..." : "Start Nytt Spill"}
            </StyledButton>
            <StyledButton
              href="/spill-mot-ai"
              variant="secondary"
              className="w-full sm:w-auto flex-grow"
            >
              Spill mot AI
            </StyledButton>
          </div>

          <ActiveGamesSection
            games={activeGames}
            isLoading={isLoadingActiveGames}
            error={errorActiveGames}
            onRetryFetch={fetchActiveGames}
          />
        </motion.main>

        <footer className="py-8 mt-10 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Ditt Go Spill.
          </p>
        </footer>
      </div>
    </motion.div>
  );
}
