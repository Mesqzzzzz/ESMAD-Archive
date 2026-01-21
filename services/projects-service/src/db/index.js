import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.SQLITE_PATH || "./data/projects.db";

let db;

export async function getDb() {
  if (db) return db;

  // garante pasta ./data dentro do container
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export async function initDb() {
  const database = await getDb();
  const schemaPath = path.resolve("src/db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await database.exec(schema);
}
