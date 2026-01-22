require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios"); // ✅ adicionar
const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).send("ok"));

// ✅ GraphQL proxy (POST /graphql -> projects-service /graphql)
app.post("/graphql", async (req, res) => {
  try {
    const base =
      process.env.PROJECTS_SERVICE_URL || "http://projects-service:3002";
    const url = `${base}/graphql`;

    const headers = {
      "Content-Type": "application/json",
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const response = await axios.post(url, req.body, {
      headers,
      validateStatus: () => true,
    });

    res.status(response.status).send(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// (opcional) GraphQL playground/GET (se fores ao browser)
// alguns clientes fazem GET /graphql por engano
app.get("/graphql", (_req, res) => {
  res.status(405).send("Use POST /graphql");
});

app.use("/", routes);

app.get("/", (req, res) => {
  res.send("API Gateway is running");
});

module.exports = app;
