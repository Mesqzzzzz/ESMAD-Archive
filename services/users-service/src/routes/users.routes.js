const express = require("express");
const router = express.Router();
const db = require("../../db");

// -------- LISTAR TODOS --------
router.get("/all", (req, res) => {
  db.all("SELECT id, name, email FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows);
  });
});

// -------- OBTER POR ID --------
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  db.get("SELECT id, name, email FROM users WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "User not found" });
    return res.json(row);
  });
});

module.exports = router;
