import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

// Estende o tipo Request do Express para incluir os dados do usuario autenticado
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: "PLAYER" | "CLUB_OWNER";
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization; // formato esperado: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticacao ausente" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalido ou expirado" });
  }
}

// Middleware extra para proteger rotas exclusivas de dono de clube
export function requireClubOwner(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "CLUB_OWNER") {
    return res.status(403).json({ error: "Acesso restrito a donos de arena" });
  }
  next();
}
