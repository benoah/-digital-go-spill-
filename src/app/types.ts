export interface GameInfo {
  // <--- VURDER Å FLYTTE DENNE
  id: string;
  status: string;
  playerCount: number;
  createdAt: string;
}

export interface ActiveGamesSectionProps {
  games: GameInfo[];
  isLoading: boolean;
  error: string | null;
  onRetryFetch: () => void;
}
