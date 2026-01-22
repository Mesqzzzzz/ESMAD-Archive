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

    const result = await db.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name, email, hashedPassword],
    );

    const userId = result.rows?.[0]?.id;

    return res.status(201).json({
      message: "Utilizador criado com sucesso",
      userId,
    });
  } catch (err) {
    // unique violation no Postgres
    if (err && err.code === "23505") {
      return res.status(409).json({ error: "Email já registado" });
    }
    console.error("REGISTER error:", err);
    return res.status(500).json({ error: "Erro ao criar utilizador" });
  }
});

// -------- LOGIN --------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e password são obrigatórios" });
  }

  try {
    const result = await db.query(
      `SELECT id, name, email, password
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );

    const user = result.rows?.[0];
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
  } catch (err) {
    console.error("LOGIN error:", err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

module.exports = router;
