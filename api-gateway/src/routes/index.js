const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const SERVICES = {
  users: process.env.USERS_SERVICE_URL || "http://esmad_users-service:3001",
  auth: process.env.USERS_SERVICE_URL || "http://esmad_users-service:3001",
  projects:
    process.env.PROJECTS_SERVICE_URL || "http://esmad_projects-service:3002",
  files:
    process.env.FILES_SERVICE_URL || "http://esmad_files-manager-service:3004",
  notifications:
    process.env.NOTIFICATIONS_SERVICE_URL ||
    "http://esmad_notifications-service:3005",
};

function extractUserIdFromAuthHeader(authHeader) {
  if (!authHeader) return null;
  const token = String(authHeader).startsWith("Bearer ")
    ? String(authHeader).slice(7)
    : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId || decoded.id || decoded.sub || null;
  } catch {
    return null;
  }
}

// ✅ /health primeiro (para não cair no proxy)
router.get("/health", (_req, res) =>
  res.json({ ok: true, service: "api-gateway" }),
);

// ✅ /status primeiro (para não cair no proxy)
router.get("/status", async (_req, res) => {
  const results = {};

  await Promise.all(
    Object.entries(SERVICES).map(async ([name, baseUrl]) => {
      try {
        const r = await axios.get(`${baseUrl}/health`, {
          timeout: 2500,
          validateStatus: () => true,
        });
        results[name] =
          r.status >= 200 && r.status < 300 ? "online" : `error(${r.status})`;
      } catch {
        results[name] = "offline";
      }
    }),
  );

  res.json({ services: results });
});

async function proxyToService(req, res) {
  const { service } = req.params;
  const path = req.params[0] || "";

  const baseUrl = SERVICES[service];
  if (!baseUrl) return res.status(404).json({ error: "Service not found" });

  const qs = req.originalUrl.includes("?")
    ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
    : "";

  const targetUrl = path
    ? `${baseUrl}/${service}/${path}${qs}`
    : `${baseUrl}/${service}${qs}`;

  try {
    const headers = {};

    // content-type
    if (req.headers["content-type"]) {
      headers["content-type"] = req.headers["content-type"];
    }

    // ✅ forward x-user-id se vier do cliente (Postman/debug)
    if (req.headers["x-user-id"]) {
      headers["x-user-id"] = String(req.headers["x-user-id"]);
    }

    // Authorization + fallback para extrair userId
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;

      if (!headers["x-user-id"]) {
        const userId = extractUserIdFromAuthHeader(req.headers.authorization);
        if (userId) headers["x-user-id"] = String(userId);
      }
    }

    const response = await axios.request({
      url: targetUrl,
      method: req.method,
      headers,
      data: req.body,
      timeout: 15000,
      validateStatus: () => true,
    });

    return res.status(response.status).send(response.data);
  } catch (err) {
    console.error("Gateway proxy failed:", {
      service,
      targetUrl,
      message: err.message,
    });
    return res.status(502).json({ error: "Bad gateway", detail: err.message });
  }
}

// ✅ suporta /notifications
router.all("/:service", proxyToService);

// ✅ suporta /notifications/10/read
router.all("/:service/*", proxyToService);

module.exports = router;
