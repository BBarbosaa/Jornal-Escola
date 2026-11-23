import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

function lerSegredo(nome: string): string {
  const valor = process.env[nome];
  if (valor === undefined || valor.length < 32) {
    throw new Error(`${nome} em falta ou demasiado curta no .env (mínimo 32 caracteres).`);
  }
  return valor;
}

// Compara em tempo constante: os dois hashes SHA-256 têm sempre 32 bytes
function iguais(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function exigirApiKey(req: Request, res: Response, next: NextFunction): void {
  const chave = req.get("x-api-key");
  if (chave === undefined || !iguais(chave, lerSegredo("API_KEY"))) {
    res.status(401).json({ erro: "API key em falta ou inválida." });
    return;
  }
  next();
}
