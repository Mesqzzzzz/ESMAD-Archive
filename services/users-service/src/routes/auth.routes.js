const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../../db");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// -------- REGISTER --------
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.status(409).json({ error: "Email já registado" });
          }
          return res.status(500).json({ error: "Erro ao criar utilizador" });
        }

        return res.status(201).json({
          message: "Utilizador criado com sucesso",
          userId: this.lastID,
        });
      },
    );
  } catch {
    return res.status(500).json({ error: "Erro interno" });
  }
});

// -------- LOGIN --------
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e password são obrigatórios" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Credenciais inválidas" });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "2h" },
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
});

module.exports = router;
