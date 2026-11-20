import { Router } from "express";
import bcrypt from "bcrypt";
import { autenticar } from "../middlewares/autenticacao.ts";
import { encriptar } from "../utils/cripto.ts";
import { validarAtualizacao } from "../utils/validacao.ts";
import {
  SALT_ROUNDS,
  lerJornalistas,
  gravarJornalistas,
  normalizarEmail,
  procurarJornalistaPorId,
  emailJaExiste,
  formatarPerfil,
} from "../services/jornalistas.ts";

const router = Router();

router.use(autenticar);

router.get("/perfil", async (req, res) => {
  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorId(jornalistas, req.jornalistaId);

  if (!jornalista) {
    res.status(404).json({ erro: "Jornalista não encontrado." });
    return;
  }

  res.json(formatarPerfil(jornalista));
});

router.put("/perfil", async (req, res) => {
  const erros = validarAtualizacao(req.body);
  if (erros.length > 0) {
    res.status(400).json({ erro: erros[0], erros });
    return;
  }

  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorId(jornalistas, req.jornalistaId);

  if (!jornalista) {
    res.status(404).json({ erro: "Jornalista não encontrado." });
    return;
  }

  if (req.body.email !== undefined) {
    const novoEmail = normalizarEmail(req.body.email as string);
    if (emailJaExiste(jornalistas, novoEmail, jornalista.id)) {
      res.status(409).json({ erro: "Já existe um jornalista registado com este email." });
      return;
    }
    jornalista.email = novoEmail;
  }

  if (req.body.nome !== undefined) {
    jornalista.nome = (req.body.nome as string).trim();
  }

  if (req.body.password !== undefined) {
    jornalista.password = await bcrypt.hash(req.body.password as string, SALT_ROUNDS);
  }

  if (req.body.telefone !== undefined) {
    jornalista.telefone = encriptar((req.body.telefone as string).trim());
  }

  await gravarJornalistas(jornalistas);
  res.json(formatarPerfil(jornalista));
});

router.delete("/perfil", async (req, res) => {
  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorId(jornalistas, req.jornalistaId);

  if (!jornalista) {
    res.status(404).json({ erro: "Jornalista não encontrado." });
    return;
  }

  const atualizados = jornalistas.filter((j) => j.id !== jornalista.id);
  await gravarJornalistas(atualizados);

  res.json({ mensagem: "Perfil apagado com sucesso." });
});

export default router;
