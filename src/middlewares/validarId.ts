import type { NextFunction, Request, Response } from "express";

export function validarId(req: Request, res: Response, next: NextFunction): void {
  const id = req.params.id;
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
    res.status(400).json({ erro: `O id «${id}» não é válido (usa um número inteiro maior que 0).` });
    return;
  }
  next();
}