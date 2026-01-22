const express = require("express");
const router = express.Router();
const axios = require("axios");

const SERVICES = {
  users: process.env.USERS_SERVICE_URL || "http://localhost:3001",
  auth: process.env.USERS_SERVICE_URL || "http://localhost:3001",
  projects: process.env.PROJECTS_SERVICE_URL || "http://localhost:3002",
  files: process.env.FILES_SERVICE_URL || "http://localhost:3004",
};

// Proxy genérico para GET, POST, PUT, DELETE
router.all("/:service/*", async (req, res) => {
  const { service } = req.params;
  const path = req.params[0] || "";

  if (!SERVICES[service])
    return res.status(404).json({ error: "Service not found" });

  try {
    // Ex:
    // /users/register -> http://users-service:3001/users/register
    // /files/init -> http://files-manager-service:3004/files/init
    const url = path
      ? `${SERVICES[service]}/${service}/${path}`
      : `${SERVICES[service]}/${service}`;

    const method = req.method.toLowerCase();
    const data = req.body;

    // Passar headers (JWT) para o serviço destino
    const headers = {};
    if (req.headers.authorization)
      headers.authorization = req.headers.authorization;

    const response = await axios({
      url,
      method,
      data,
      headers,
      validateStatus: () => true,
    });

    // Mantém resposta do serviço
    res.status(response.status).send(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- /status -------------------
router.get("/status", async (req, res) => {
  const results = {};

  await Promise.all(
    Object.entries(SERVICES).map(async ([name, baseUrl]) => {
      try {
        // Quase todos os teus serviços têm /health
        await axios.get(`${baseUrl}/health`, { timeout: 2500 });
        results[name] = "online";
      } catch (err) {
        results[name] = "offline";
      }
    }),
  );

  res.json({ services: results });
});

module.exports = router;
