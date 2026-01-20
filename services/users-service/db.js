const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "users.db"), (err) => {
  if (err) {
    console.error("Erro ao ligar SQLite", err);
  } else {
    console.log("SQLite ligado com sucesso");
  }
});

// Criar tabela users se não existir
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
});

module.exports = db;
