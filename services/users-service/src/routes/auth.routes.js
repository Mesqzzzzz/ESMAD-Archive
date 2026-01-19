const express = require("express");
const router = express.Router();

let users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

router.get("/", (req, res) => res.json(users));

router.get("/:id", (req, res) => {
  const user = users.find((u) => u.id == req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

router.post("/", (req, res) => {
  const newUser = { id: users.length + 1, ...req.body };
  users.push(newUser);
  res.status(201).json(newUser);
});

module.exports = router;
