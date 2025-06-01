// src/lib/db.ts
import pg from "pg";

const { Pool } = pg;

// Hent tilkoblingsstrengen fra miljøvariabelen
const connectionString = process.env.DATABASE_URL;

let dbConfig;

if (connectionString) {
  console.log(
    "--- [DB_CONFIG] Connecting using DATABASE_URL environment variable ---"
  );
  dbConfig = {
    connectionString: connectionString,
    // SSL kan være nødvendig for eksterne databaser, men vanligvis ikke for Docker Compose internt nettverk
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  };
} else {
  // Fallback til individuelle miljøvariabler eller hardkodede verdier
  // (for lokal utvikling der socketServer.ts kjører utenfor Docker, men DB er i Docker)
  console.log(
    "--- [DB_CONFIG] DATABASE_URL not set, using individual params/fallbacks (localhost) ---"
  );
  dbConfig = {
    user: process.env.POSTGRES_USER || "go_user",
    host: process.env.POSTGRES_HOST || "localhost", // For lokal dev mot Docker DB
    database: process.env.POSTGRES_DB || "go_game_db",
    password: process.env.POSTGRES_PASSWORD || "go_password",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    connectionTimeoutMillis: 10000,
  };
}

console.log("User:", connectionString ? "[From DATABASE_URL]" : dbConfig.user);
console.log("Host:", connectionString ? "[From DATABASE_URL]" : dbConfig.host);
console.log(
  "Database:",
  connectionString ? "[From DATABASE_URL]" : dbConfig.database
);
console.log(
  "Password:",
  dbConfig.password || connectionString ? "********" : "Not set or empty"
);
console.log("Port:", connectionString ? "[From DATABASE_URL]" : dbConfig.port);
console.log(
  "---------------------------------------------------------------------"
);

const pool = new Pool(dbConfig);

pool.on("error", (err, client) => {
  console.error("Uventet feil på inaktiv databaseklient", err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Unngå å logge for lange board_state strenger for SELECTs
    const logText = text.length > 200 ? text.substring(0, 197) + "..." : text;
    console.log("[DB Query]", {
      text: logText,
      duration: `${duration}ms`,
      rows: res.rowCount,
    });
    return res;
  } catch (err) {
    console.error("[DB Query Error]", { text, params }, err);
    throw err;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export const testDbConnection = async (
  retries = 7,
  delay = 4000
): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      const userToLog = connectionString
        ? "[Using DATABASE_URL]"
        : dbConfig.user;
      console.log(
        `[DB_TEST] Forsøk ${
          i + 1
        }/${retries} på å koble til som ${userToLog}...`
      );
      const client = await pool.connect();
      console.log(
        `🐘 Vellykket tilkobling til PostgreSQL (forsøk ${i + 1}/${retries})!`
      );
      const currentUserResult = await client.query(
        "SELECT CURRENT_USER, current_database()"
      );
      console.log(
        "   Koblet til som bruker:",
        currentUserResult.rows[0].current_user,
        "til database:",
        currentUserResult.rows[0].current_database
      );
      const timeResult = await client.query("SELECT NOW()");
      console.log("   Nåværende tid fra DB:", timeResult.rows[0].now);
      client.release();
      return true;
    } catch (error: any) {
      console.warn(
        `❌ Feil ved tilkobling til PostgreSQL (forsøk ${i + 1}/${retries}):`,
        error.message
      );
      if (i < retries - 1) {
        console.log(`   Prøver igjen om ${delay / 1000} sekunder...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error("❌ Ga opp etter flere forsøk på å koble til databasen.");
        return false;
      }
    }
  }
  return false;
};

export default pool;
