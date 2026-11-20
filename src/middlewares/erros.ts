import type { Request, Response, NextFunction } from "express";

export function rotaNaoEncontrada(req: Request, res: Response) {
  res.status(404).json({ erro: "Rota não encontrada" });
}

export function tratarErros(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof SyntaxError) {
    res.status(400).json({ erro: "JSON inválido no corpo do pedido" });
    return;
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor" });
}