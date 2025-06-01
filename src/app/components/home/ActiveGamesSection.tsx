"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ActiveGamesSectionProps, GameInfo } from "@/app/types";

const listVariants = {
  visible: { transition: { staggerChildren: 0.07 } },
  hidden: {},
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 250, damping: 20 },
  },
};

export function ActiveGamesSection({
  games,
  isLoading,
  error,
  onRetryFetch,
}: ActiveGamesSectionProps) {
  return (
    <motion.section
      className="mt-12 md:mt-16 w-full bg-slate-700/30 dark:bg-slate-800/40 backdrop-blur-lg p-6 rounded-xl shadow-2xl border border-slate-600/50"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
    >
      <motion.h2
        className="mb-6 text-3xl sm:text-4xl font-extrabold text-center tracking-tight text-slate-100 [text-shadow:0px_2px_5px_rgba(0,0,0,0.35)]"
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 12,
          delay: 0.5,
        }}
      >
        Pågående Spill
      </motion.h2>

      {isLoading ? (
        <motion.p className="text-center text-slate-300 dark:text-slate-300 py-4">
          Laster spill...
        </motion.p>
      ) : error ? (
        <motion.div className="text-center py-4">
          <p className="text-red-400 dark:text-red-300">Feil: {error}</p>
          <button
            onClick={onRetryFetch}
            className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-sm transition-colors"
          >
            Prøv igjen
          </button>
        </motion.div>
      ) : games.length > 0 ? (
        <motion.ul
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={listVariants}
        >
          {games.map((game) => (
            <GameListItem key={game.id} game={game} /> // Bruker en ny GameListItem komponent (se neste punkt)
          ))}
        </motion.ul>
      ) : (
        <motion.p
          className="text-center text-slate-300 dark:text-slate-300 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Ingen aktive spill for øyeblikket. Start et nytt!
        </motion.p>
      )}
    </motion.section>
  );
}

// Ny komponent for hvert spillelement
interface GameListItemProps {
  game: GameInfo;
}

function GameListItem({ game }: GameListItemProps) {
  // TODO: Vurder en rute-konstant for spill-siden også, f.eks. ROUTES.GAME(game.id)
  const gameUrl = `/spill/${game.id}`;

  return (
    <motion.li
      className="p-4 border rounded-lg shadow-lg cursor-pointer
                   transition-all duration-200 ease-out
                   bg-slate-600/40 hover:bg-slate-500/50 dark:bg-slate-700/50 dark:hover:bg-slate-600/60
                   text-slate-100 dark:text-slate-100 border-slate-500/50 dark:border-slate-600/70
                   hover:shadow-xl hover:scale-[1.025] hover:-translate-y-1
                   active:scale-[1.01] active:translate-y-0"
      variants={itemVariants} // Bruker variantene definert ovenfor
    >
      <Link
        href={gameUrl}
        className="block group focus:outline-none"
        aria-label={`Gå til spill ${game.id.substring(0, 12)}`}
      >
        <h3 className="font-semibold group-hover:text-sky-300 dark:group-hover:text-sky-400 text-lg sm:text-xl tracking-normal break-words">
          Spill ID: {game.id.substring(0, 12)}
        </h3>
        <p className="text-sm opacity-90 mt-0.5 break-words">
          ({game.playerCount}/2 spillere) - Status: {game.status}
        </p>
        <small className="block text-xs opacity-75 mt-1.5">
          Opprettet:{" "}
          {new Date(game.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          - {new Date(game.createdAt).toLocaleDateString()}
        </small>
      </Link>
    </motion.li>
  );
}
