import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";

import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";
import { initDb } from "./db/index.js";

const PORT = Number(process.env.PORT || 3002);
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

async function start() {
  await initDb();

  const app = express();

  app.use(
    cors({
      origin:
        CORS_ORIGIN === "*"
          ? true
          : CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));

  // extrair user do JWT
  app.use((req, _res, next) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    req.token = token || null;

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

  app.get("/health", (_req, res) => res.json({ ok: true }));

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: req.user ?? null,
        token: req.token ?? null, // ✅ importante
      }),
    }),
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`projects-service listening on 0.0.0.0:${PORT}`);
    console.log(`GraphQL: /graphql | Health: /health`);
  });
}

start().catch((err) => {
  console.error("Failed to start projects-service:", err);
  process.exit(1);
});
