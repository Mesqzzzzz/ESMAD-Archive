const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://esmad:esmadpass@postgres:5432/esmad";

let pool;

function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      // Se um dia usares TLS (cloud), podes precisar:
      // ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

// Espera o Postgres arrancar (muito importante em Swarm/Compose)
async function waitForDb(retries = 25, delayMs = 1000) {
  const db = getDb();
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

// Inicializa schema do users-service
async function initDb() {
  await waitForDb();

  const schemaPath = path.join(__dirname, "schema.sql");

  // Se não quiseres ficheiro schema.sql separado, posso embutir aqui.
  const schema = fs.readFileSync(schemaPath, "utf-8");

  await getDb().query(schema);
  console.log("Postgres (users-service) inicializado com sucesso");
}

// chamamos init automaticamente ao importar (mantém o comportamento "auto-init")
initDb().catch((err) => {
  console.error("Erro a inicializar Postgres (users-service):", err);
  process.exit(1);
});

module.exports = getDb();
