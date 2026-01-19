const express = require("express");
const router = express.Router();

let projects = [
  { id: 1, name: "Projeto A", description: "Descrição do Projeto A" },
  { id: 2, name: "Projeto B", description: "Descrição do Projeto B" },
];

router.get("/", (req, res) => res.json(projects));

router.get("/:id", (req, res) => {
  const project = projects.find((p) => p.id == req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.post("/", (req, res) => {
  const newProject = { id: projects.length + 1, ...req.body };
  projects.push(newProject);
  res.status(201).json(newProject);
});

module.exports = router;
