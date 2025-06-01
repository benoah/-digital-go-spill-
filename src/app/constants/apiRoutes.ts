export const API_ROUTES = {
  ACTIVE_GAMES: "/api/games/active",
  CREATE_GAME: "/api/games/create",
};

// Eventuelt, hvis du foretrekker å ikke ha alt nestet under API_ROUTES:
// export const ACTIVE_GAMES_URL = "/api/games/active";
// export const CREATE_GAME_URL = "/api/games/create";

export const getGameDetailsUrl = (gameId: string): string => {
  if (!gameId) {
    console.error("gameId er påkrevd for getGameDetailsUrl");
    return "/api/games/invalid-id"; // Eller throw new Error("gameId mangler");
  }
  return `/api/games/${gameId}`;
};
