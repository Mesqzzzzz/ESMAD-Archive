const express = require("express");
const router = express.Router();
const axios = require("axios");

const SERVICES = {
  users: process.env.USERS_SERVICE_URL || "http://localhost:3001",
  auth: process.env.USERS_SERVICE_URL || "http://localhost:3001",
  projects: process.env.PROJECTS_SERVICE_URL || "http://localhost:3002",
  categories: process.env.CATEGORIES_SERVICE_URL || "http://localhost:3003",
};

// Proxy genérico para GET, POST, PUT, DELETE
router.all("/:service/*", async (req, res) => {
  const { service } = req.params;
  const path = req.params[0] || "";
  if (!SERVICES[service])
    return res.status(404).json({ error: "Service not found" });

  try {
    const url = path
      ? `${SERVICES[service]}/${service}/${path}`
      : `${SERVICES[service]}/${service}`;
    const method = req.method.toLowerCase();
    const data = req.body;

    const response = await axios({ url, method, data });
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ------------------- NOVA ROTA /status -------------------
router.get("/status", async (req, res) => {
  const results = {};

  await Promise.all(
    Object.entries(SERVICES).map(async ([name, url]) => {
      try {
        await axios.get(url); // faz GET simples no serviço
        results[name] = "online";
      } catch (err) {
        results[name] = "offline";
      }
    }),
  );

  res.json({ services: results });
});

module.exports = router;
