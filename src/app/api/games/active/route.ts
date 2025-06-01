// src/app/api/games/active/route.ts
import { NextResponse } from "next/server";
import { query } from "../../../../../server/lib/db";

// Interface for data som hentes fra 'games'-tabellen for denne ruten
interface GameRowFromDB {
  id: string;
  status: "waiting_for_players" | "in_progress" | "finished" | "aborted";
  players: { id: string; playerNumber: 1 | 2 }[];
  created_at: Date;
}

// Interface for data som sendes til klienten
interface ActiveGameInfo {
  id: string;
  status: string;
  playerCount: number;
  createdAt: string; // ISO-streng
}

export async function GET() {
  console.log("[API /api/games/active] Mottok GET-forespørsel");
  try {
    const dbResult = await query(
      `SELECT id, status, players, created_at 
       FROM games 
       WHERE status = 'waiting_for_players' OR status = 'in_progress' 
       ORDER BY created_at DESC`
    );

    if (!dbResult || !dbResult.rows) {
      console.warn(
        "[API /api/games/active] Ingen resultat fra database eller ingen rader funnet."
      );
      return NextResponse.json(
        { message: "Ingen aktive spill funnet eller feil ved henting." },
        { status: 404 }
      );
    }

    const activeGames: ActiveGameInfo[] = dbResult.rows.map(
      (gameRow: GameRowFromDB) => {
        const playersArray = Array.isArray(gameRow.players)
          ? gameRow.players
          : JSON.parse(gameRow.players || "[]");

        return {
          id: gameRow.id,
          status: gameRow.status
            ? gameRow.status.replace(/_/g, " ")
            : "Ukjent status",
          playerCount: playersArray.length,
          createdAt:
            gameRow.created_at instanceof Date
              ? gameRow.created_at.toISOString()
              : String(gameRow.created_at),
        };
      }
    );

    console.log(
      `[API /api/games/active] Fant ${activeGames.length} aktive spill.`
    );
    return NextResponse.json(activeGames);
  } catch (error) {
    console.error("[API /api/games/active] FEIL:", error);
    return NextResponse.json(
      {
        message: "Kunne ikke hente aktive spill på grunn av en serverfeil.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
