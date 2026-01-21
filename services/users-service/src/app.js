require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).send("ok"));

// Auth separado de Users (sem conflitos)
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);

app.get("/", (req, res) => res.send("Users service is running"));

module.exports = app;
