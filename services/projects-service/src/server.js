import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";

import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";
import { initDb } from "./db/index.js";

const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

async function start() {
  // 1) Init DB (cria tabelas se não existirem)
  await initDb();

  // 2) Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 3) (Opcional) extrair user do JWT para futuro
  app.use((req, _res, next) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }

    next();
  });

  // 4) Healthcheck
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // 5) Apollo GraphQL
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: req.user ?? null, // disponível em ctx.user nos resolvers
      }),
    }),
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`projects-service running on http://localhost:${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
}

start().catch((err) => {
  console.error("Failed to start projects-service:", err);
  process.exit(1);
});
