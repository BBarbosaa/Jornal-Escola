import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      jornalistaId?: number;
    }
  }
}

interface PayloadJwt {
  id: number;
}

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token de autenticação não fornecido." });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ erro: "Token de autenticação não fornecido." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new Error("JWT_SECRET não está definido no .env"));
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as PayloadJwt;

    if (typeof decoded.id !== "number") {
      res.status(401).json({ erro: "Token inválido." });
      return;
    }

    req.jornalistaId = decoded.id;
    next();
  } catch {
    res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}
