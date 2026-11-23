// Protege as estatísticas com uma chave partilhada enviada no cabeçalho x-api-key.
// Ao contrário do JWT, esta chave não identifica um jornalista específico.
import { createHash, timingSafeEqual } from "node:crypto";
// import type importa apenas tipos, que não são necessários durante a execução.
import type { NextFunction, Request, Response } from "express";

// Obtém a variável pelo nome e rejeita uma configuração ausente ou demasiado curta.
function lerSegredo(nome: string): string {
  const valor = process.env[nome];
  if (valor === undefined || valor.length < 32) {
    // Uma má configuração é um erro do servidor, não uma credencial errada do cliente.
    throw new Error(`${nome} em falta ou demasiado curta no .env (mínimo 32 caracteres).`);
  }
  return valor;
}

// compara em tempo constante: os dois hashes têm sempre 32 bytes
// SHA-256 produz Buffers com o mesmo tamanho, exigido por timingSafeEqual.
// A comparação evita revelar, pelo seu tempo, quantos caracteres coincidem.
// O hash serve aqui para comparar: não encripta nem guarda a API key.
function iguais(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// Middleware: ou termina o pedido com 401, ou chama next para permitir a rota.
export function exigirApiKey(req: Request, res: Response, next: NextFunction): void {
  const chave = req.get("x-api-key");
  // || faz curto-circuito: se a chave não vier no pedido, não avalia a comparação.
  if (chave === undefined || !iguais(chave, lerSegredo("API_KEY"))) {
    res.status(401).json({ erro: "API key em falta ou inválida." });
    // Enviar uma resposta não termina a função; return impede continuar até next().
    return;
  }
  next();
}
