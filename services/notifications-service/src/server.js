const express = require("express");
const jwt = require("jsonwebtoken");
const { initDb, listNotifications, markRead } = require("./db");
const { startConsumer } = require("./consumer");

const PORT = Number(process.env.PORT || 3005);
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Preferência:
 * 1) x-user-id (vindo do gateway)
 * 2) Authorization: Bearer <jwt> (fallback para testes / setups onde o gateway não injeta header)
 */
function getUserId(req) {
  const fromHeader = req.headers["x-user-id"];
  if (fromHeader) return String(fromHeader);

  const auth = req.headers["authorization"] || "";
  const m = String(auth).match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  try {
    const token = m[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    // ajusta estas chaves ao teu payload real do JWT, se necessário
    return String(decoded.userId || decoded.id || decoded.sub || "");
  } catch {
    return null;
  }
}

async function main() {
  await initDb();
  await startConsumer();

  const app = express();
  app.use(express.json());

  // (debug) CORS leve para facilitar testes no browser se necessário
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-user-id",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // GET /notifications?unread=true&limit=20&offset=0
  app.get("/notifications", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res
          .status(401)
          .json({ error: "Missing x-user-id or valid Bearer token" });

      const unread = String(req.query.unread || "").toLowerCase() === "true";
      const limit = Math.min(Number(req.query.limit || 20), 100);
      const offset = Math.max(Number(req.query.offset || 0), 0);

      const items = await listNotifications({
        userId: String(userId),
        unread,
        limit,
        offset,
      });

      res.json({ items });
    } catch (err) {
      console.error("GET /notifications failed:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // POST /notifications/:id/read
  app.post("/notifications/:id/read", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res
          .status(401)
          .json({ error: "Missing x-user-id or valid Bearer token" });

      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ error: "Invalid id" });

      const updated = await markRead({ userId: String(userId), id });
      if (!updated) return res.status(404).json({ error: "Not found" });

      res.json({ item: updated });
    } catch (err) {
      console.error("POST /notifications/:id/read failed:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`notifications-service listening on 0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("notifications-service failed:", err);
  process.exit(1);
});
