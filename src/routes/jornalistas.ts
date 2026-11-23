// Gestão do próprio perfil. A identidade vem do token, não de um id escolhido no body.
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

// Aplica a autenticação a todas as rotas declaradas abaixo neste router.
router.use(autenticar);

// GET /api/v1/jornalistas/perfil: consulta a conta do jornalista autenticado.
router.get("/perfil", async (req, res) => {
  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorId(jornalistas, req.jornalistaId);

  // Um token pode ainda ser válido mesmo que a conta tenha sido apagada; aqui verificamos a conta.
  if (!jornalista) {
    res.status(404).json({ erro: "Jornalista não encontrado." });
    return;
  }

  // Só devolve os campos de perfil, sem a password/hash.
  res.json(formatarPerfil(jornalista));
});

// PUT /api/v1/jornalistas/perfil: nesta implementação aceita atualização parcial.
// Ao contrário do PUT dos artigos, não exige que todos os campos sejam enviados.
router.put("/perfil", async (req, res) => {
  const erros = validarAtualizacao(req.body);
  if (erros.length > 0) {
    res.status(400).json({ erro: erros.join("; ") });
    return;
  }

  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorId(jornalistas, req.jornalistaId);

  if (!jornalista) {
    res.status(404).json({ erro: "Jornalista não encontrado." });
    return;
  }

  // Cada campo é alterado apenas se vier no pedido; os restantes mantêm o valor anterior.
  if (req.body.email !== undefined) {
    const novoEmail = normalizarEmail(req.body.email as string);
    // Ignora o próprio id para permitir manter o email atual sem acusar duplicado.
    if (emailJaExiste(jornalistas, novoEmail, jornalista.id)) {
      res.status(409).json({ erro: "Já existe um jornalista registado com este email." });
      return;
    }
    jornalista.email = novoEmail;
  }

  if (req.body.nome !== undefined) {
    jornalista.nome = (req.body.nome as string).trim();
  }

  // Uma password nova exige um novo hash; nunca se guarda diretamente o texto recebido.
  if (req.body.password !== undefined) {
    jornalista.password = await bcrypt.hash(req.body.password as string, SALT_ROUNDS);
  }

  // O telefone novo também tem de ser encriptado antes de ir para o ficheiro.
  if (req.body.telefone !== undefined) {
    jornalista.telefone = encriptar((req.body.telefone as string).trim());
  }

  // O objeto encontrado pertence ao array; alterar as suas propriedades altera esse array.
  await gravarJornalistas(jornalistas);
  res.json(formatarPerfil(jornalista));
});

// DELETE /api/v1/jornalistas/perfil: remove a conta autenticada.
// Limite atual: não apaga os artigos/fontes da conta nem revoga os tokens já emitidos.
router.delete("/perfil", async (req, res) => {
  const jornalistas = await lerJornalistas();
  const jornalista = procurarJornalistaPorId(jornalistas, req.jornalistaId);

  if (!jornalista) {
    res.status(404).json({ erro: "Jornalista não encontrado." });
    return;
  }

  // filter cria um novo array com todas as contas exceto a que vamos apagar.
  const atualizados = jornalistas.filter((j) => j.id !== jornalista.id);
  await gravarJornalistas(atualizados);

  // 204 significa sucesso sem corpo de resposta.
  res.status(204).send();
});

export default router;
