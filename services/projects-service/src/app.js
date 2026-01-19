const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/projects.routes"); // caminho correto

const app = express();
app.use(cors());
app.use(express.json());

// Aqui definimos a rota base
app.use("/projects", authRoutes);

app.get("/", (req, res) => {
  res.send("Projects service is running");
});

module.exports = app;
