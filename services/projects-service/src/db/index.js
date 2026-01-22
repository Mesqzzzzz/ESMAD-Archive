import fs from "fs";
import path from "path";
import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://esmad:esmadpass@postgres:5432/esmad";

let pool;

/**
 * Devolve o pool (equivalente ao "db" no SQLite), para usares nos resolvers.
 * Em vez de db.all/db.get/db.run, vais usar pool.query(...)
 */
export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      // em ambientes com TLS (ex: cloud), podes precisar disto:
      // ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * Executa o schema SQL (idempotente) no arranque.
 * Mantém a mesma ideia do SQLite: "ler schema.sql e aplicar".
 */
export async function initDb() {
  const db = getDb();

  // Esperar o Postgres estar pronto (em Swarm/compose pode demorar)
  await waitForDb(db);

  const schemaPath = path.resolve("src/db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  await db.query(schema);
}

/**
 * Tenta fazer SELECT 1 várias vezes para dar tempo ao Postgres arrancar.
 */
async function waitForDb(db, retries = 25, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await db.query("SELECT 1;");
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
