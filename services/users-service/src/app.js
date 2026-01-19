const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes"); // caminho correto

const app = express();
app.use(cors());
app.use(express.json());

// Aqui definimos a rota base
app.use("/users", authRoutes);

app.get("/", (req, res) => {
  res.send("Users service is running");
});

module.exports = app;
