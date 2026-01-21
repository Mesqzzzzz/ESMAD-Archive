import jwt from "jsonwebtoken";

export function getUserFromAuthHeader(authHeader) {
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
  } catch {
    return null;
  }
}

export function requireAuth(context) {
  if (!context?.user) {
    const err = new Error("Não autenticado");
    err.code = "UNAUTHENTICATED";
    throw err;
  }
}
