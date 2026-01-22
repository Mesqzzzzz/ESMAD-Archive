require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).send("ok"));

// ✅ Proxy direto para GraphQL do projects-service
const PROJECTS_URL =
  process.env.PROJECTS_SERVICE_URL || "http://projects-service:3002";
app.use(
  "/graphql",
  createProxyMiddleware({
    target: PROJECTS_URL,
    changeOrigin: true,
    // passa headers (incluindo Authorization)
    onProxyReq: (proxyReq, req) => {
      if (req.headers.authorization) {
        proxyReq.setHeader("Authorization", req.headers.authorization);
      }
    },
  }),
);

app.use("/", routes);

app.get("/", (req, res) => {
  res.send("API Gateway is running");
});

module.exports = app;
