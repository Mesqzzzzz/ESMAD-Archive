import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

export function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // middleware opcional: extrai user do Authorization: Bearer <token>
  app.use((req, _res, next) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (token) {
      try {
        const secret = process.env.JWT_SECRET || "supersecretkey";
        req.user = jwt.verify(token, secret);
      } catch {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    next();
  });

  return app;
}
