// Validação dos identificadores recebidos no caminho, por exemplo /artigos/3.
import type { NextFunction, Request, Response } from "express";

export function validarId(req: Request, res: Response, next: NextFunction): void {
  // Parâmetros do caminho chegam como texto, mesmo quando representam números.
  const id = req.params.id;
  // ^ e $ exigem a correspondência completa; [1-9] impede zero inicial;
  // \d* permite os restantes algarismos. Rejeita 0, -1, 1.5, 01 e letras.
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
    res.status(400).json({ erro: `O id «${id}» não é válido (usa um número inteiro maior que 0).` });
    return;
  }
  // Só prossegue se o formato do id for válido. A existência é verificada na rota.
  next();
}
