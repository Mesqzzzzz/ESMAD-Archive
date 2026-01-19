const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/categories.routes"); // caminho correto

const app = express();
app.use(cors());
app.use(express.json());

// Aqui definimos a rota base
app.use("/categories", authRoutes);

app.get("/", (req, res) => {
  res.send("Categories service is running");
});

module.exports = app;
