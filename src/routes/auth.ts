// Rotas públicas de registo e login: ainda não exigem token de autenticação.
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

// Router agrupa as rotas que app.ts monta em /api/v1/auth.
const router = Router();

// POST /api/v1/auth/registo: recebe nome, email, password e telefone no body JSON.
// async permite usar await para aguardar operações sem bloquear o ciclo de eventos.
router.post("/registo", async (req, res) => {
  const erros = validarRegisto(req.body);
  // Valida antes de guardar. 400 significa que os dados enviados são inválidos.
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join("; ") });
    return;
  }

  // trim remove espaços à volta; a password é preservada exatamente como foi enviada.
  // "as string" é uma indicação de tipo, apoiada na validação feita acima.
  const nome = (req.body.nome as string).trim();
  const email = normalizarEmail(req.body.email as string);
  const password = req.body.password as string;
  const telefone = (req.body.telefone as string).trim();

  const jornalistas = await lerJornalistas();
  // 409 indica conflito: o email já pertence a uma conta.
  if (emailJaExiste(jornalistas, email)) {
    res.status(409).json({ erro: "Já existe um jornalista registado com este email." });
    return;
  }

  // map recolhe os ids; ... passa-os a Math.max; soma 1 ao maior id existente.
  // Se o array estiver vazio, começa em 1. Não garante unicidade entre pedidos simultâneos.
  const novoId =
    jornalistas.length > 0 ? Math.max(...jornalistas.map((j) => j.id)) + 1 : 1;

  const novoJornalista: Jornalista = {
    id: novoId,
    nome,
    email,
    // bcrypt gera um hash com salt. A password original não é guardada nem recuperável.
    password: await bcrypt.hash(password, SALT_ROUNDS),
    // O telefone precisa de ser recuperado no perfil, por isso é encriptado com chave.
    telefone: encriptar(telefone),
  };

  // push altera o array em memória; só gravarJornalistas persiste a alteração em disco.
  jornalistas.push(novoJornalista);
  await gravarJornalistas(jornalistas);

  // 201 = recurso criado. A resposta omite o hash e apresenta o telefone desencriptado.
  res.status(201).json(formatarPerfil(novoJornalista));
});

// POST /api/v1/auth/login: troca credenciais válidas por um token temporário.
router.post("/login", async (req, res) => {
  // Desestrutura o body; ?? {} evita tentar retirar propriedades de null/undefined.
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    res.status(400).json({ erro: "Email e password são obrigatórios." });
    return;
  }

  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorEmail(jornalistas, email);

  // O operador ternário só compara o hash se a conta existir; caso contrário dá false.
  const passwordValida = jornalista
    ? await bcrypt.compare(password, jornalista.password)
    : false;

  // A mensagem é a mesma para email desconhecido e password errada (401).
  if (!jornalista || !passwordValida) {
    res.status(401).json({ erro: "Credenciais inválidas." });
    return;
  }

  // Segredo do servidor para assinar/verificar os tokens; não é a password do utilizador.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não está definido no .env");
  }

  // || usa 1h também se a configuração for uma string vazia.
  const expiresIn = (process.env.JWT_EXPIRA || "1h") as jwt.SignOptions["expiresIn"];
  // HS256 assina o payload com o segredo partilhado pelo emissor e pelo verificador.
  // Um JWT assinado não é encriptado: o id pode ser lido, mas alterações invalidam a assinatura.
  const token = jwt.sign({ id: jornalista.id }, secret, { algorithm: "HS256", expiresIn });

  // Por defeito a resposta é 200. O cliente envia este token como Bearer nos pedidos seguintes.
  res.json({ token });
});

export default router;
