import * as authService from "../services/auth.service.js";

export const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const token = await authService.login(req.body);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

export const me = (req, res) => {
  res.json(req.user);
};
