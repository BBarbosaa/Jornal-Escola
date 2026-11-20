import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Jornalista } from "../tipos.ts";
import { encriptar } from "../utils/cripto.ts";
import { validarRegisto } from "../utils/validacao.ts";
import {
  SALT_ROUNDS,
  lerJornalistas,
  gravarJornalistas,
  normalizarEmail,
  procurarJornalistaPorEmail,
  emailJaExiste,
  formatarPerfil,
} from "../services/jornalistas.ts";

const router = Router();

router.post("/registo", async (req, res) => {
  const erros = validarRegisto(req.body);
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join("; ") });
    return;
  }

  const nome = (req.body.nome as string).trim();
  const email = normalizarEmail(req.body.email as string);
  const password = req.body.password as string;
  const telefone = (req.body.telefone as string).trim();

  const jornalistas = await lerJornalistas();
  if (emailJaExiste(jornalistas, email)) {
    res.status(409).json({ erro: "Já existe um jornalista registado com este email." });
    return;
  }

  const novoId =
    jornalistas.length > 0 ? Math.max(...jornalistas.map((j) => j.id)) + 1 : 1;

  const novoJornalista: Jornalista = {
    id: novoId,
    nome,
    email,
    password: await bcrypt.hash(password, SALT_ROUNDS),
    telefone: encriptar(telefone),
  };

  jornalistas.push(novoJornalista);
  await gravarJornalistas(jornalistas);

  res.status(201).json(formatarPerfil(novoJornalista));
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    res.status(400).json({ erro: "Email e password são obrigatórios." });
    return;
  }

  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorEmail(jornalistas, email);

  const passwordValida = jornalista
    ? await bcrypt.compare(password, jornalista.password)
    : false;

  if (!jornalista || !passwordValida) {
    res.status(401).json({ erro: "Credenciais inválidas." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não está definido no .env");
  }

  const expiresIn = (process.env.JWT_EXPIRA || "1h") as jwt.SignOptions["expiresIn"];
  const token = jwt.sign({ id: jornalista.id }, secret, { algorithm: "HS256", expiresIn });

  res.json({ token });
});

export default router;
