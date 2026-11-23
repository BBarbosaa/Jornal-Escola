import type { Request, Response, NextFunction } from "express";

export function rotaNaoEncontrada(req: Request, res: Response): void {
  res.status(404).json({ erro: `A rota ${req.method} ${req.originalUrl} não existe.` });
}

function eErroDeJson(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null &&
    "type" in erro && erro.type === "entity.parse.failed";
}

// Quatro parâmetros obrigatórios para o Express reconhecer como middleware de erros
export function tratarErros(erro: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(erro);
    return;
  }
  if (eErroDeJson(erro)) {
    res.status(400).json({ erro: "O corpo do pedido não é JSON válido." });
    return;
  }
  console.error(`Erro em ${req.method} ${req.originalUrl}:`, erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
}
