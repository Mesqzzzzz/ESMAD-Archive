const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/projects.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).send("ok"));

// rota base
app.use("/projects", authRoutes);

app.get("/", (req, res) => {
  res.send("Projects service is running");
});

module.exports = app;
