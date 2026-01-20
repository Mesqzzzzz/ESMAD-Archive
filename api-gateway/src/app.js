require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).send("ok"));

app.use("/", routes);

app.get("/", (req, res) => {
  res.send("API Gateway is running");
});

module.exports = app;
