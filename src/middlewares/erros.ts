// Respostas de erro consistentes para toda a API, em formato JSON.
import type { Request, Response, NextFunction } from "express";

// Executado no fim das rotas quando nenhuma respondeu ao método/endereço recebido.
export function rotaNaoEncontrada(req: Request, res: Response): void {
  res.status(404).json({ erro: `A rota ${req.method} ${req.originalUrl} não existe.` });
}

// unknown obriga a verificar o valor antes de aceder às propriedades.
// express.json() identifica desta forma os erros de sintaxe no corpo JSON.
function eErroDeJson(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null &&
    "type" in erro && erro.type === "entity.parse.failed";
}

// Os quatro parâmetros fazem o Express reconhecer esta função como middleware de erros.
// No Express 5, rejeições das funções async das rotas também chegam aqui.
export function tratarErros(erro: unknown, req: Request, res: Response, next: NextFunction): void {
  // Se a resposta já começou, não podemos enviar uma segunda resposta JSON.
  if (res.headersSent) {
    next(erro);
    return;
  }
  // 400: o cliente enviou um corpo que não pode ser interpretado como JSON.
  if (eErroDeJson(erro)) {
    res.status(400).json({ erro: "O corpo do pedido não é JSON válido." });
    return;
  }
  // Regista os detalhes no servidor e envia uma mensagem genérica ao cliente (500).
  console.error(`Erro em ${req.method} ${req.originalUrl}:`, erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
}
