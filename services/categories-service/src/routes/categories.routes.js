const express = require("express");
const router = express.Router();

let categories = [
  { id: 1, name: "Categoria X" },
  { id: 2, name: "Categoria Y" },
];

router.get("/", (req, res) => res.json(categories));

router.get("/:id", (req, res) => {
  const category = categories.find((c) => c.id == req.params.id);
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
});

router.post("/", (req, res) => {
  const newCategory = { id: categories.length + 1, ...req.body };
  categories.push(newCategory);
  res.status(201).json(newCategory);
});

module.exports = router;
