import { Router } from "express";
import type { Request } from "express";
import { validarId } from "../middlewares/validarId.ts";
import { lerDados, gravarDados } from "../utils/ficheiros.ts";
import {
  eAlteracaoArtigo,
  eArtigoCompleto,
  eArtigoNovo,
  eEstado,
  problemasAlteracaoArtigo,
  problemasArtigo,
} from "../utils/validarArtigo.ts";
import type { Artigo, Fonte } from "../tipos.ts";
import { autenticar } from "../middlewares/autenticacao.ts";

const router = Router();

router.use(autenticar);

function obterJornalistaId(req: Request): number | null {
  if (!("jornalistaId" in req)) {
    return null;
  }
  const id = Number(req.jornalistaId);
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }
  return id;
}

// GET /api/v1/artigos — listar artigos do jornalista autenticado (com filtro e paginação)
router.get("/", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const pagina = Number(req.query.pagina ?? 1);
  const limite = Number(req.query.limite ?? 10);
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1) {
    res.status(400).json({ erro: "Os parâmetros pagina e limite têm de ser números inteiros maiores que 0." });
    return;
  }

  const estado = req.query.estado;
  if (estado !== undefined && !eEstado(estado)) {
    res.status(400).json({ erro: 'O parâmetro estado tem de ser "rascunho" ou "publicado".' });
    return;
  }

  const pesquisa = req.query.pesquisa;
  if (pesquisa !== undefined && typeof pesquisa !== "string") {
    res.status(400).json({ erro: "O parâmetro pesquisa tem de ser texto." });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  let filtrados = artigos.filter((a) => a.jornalistaId === jornalistaId);

  if (estado !== undefined) {
    filtrados = filtrados.filter((a) => a.estado === estado);
  }

  if (pesquisa !== undefined && pesquisa.trim() !== "") {
    const termo = pesquisa.trim().toLowerCase();
    filtrados = filtrados.filter(
      (a) => a.titulo.toLowerCase().includes(termo) || a.texto.toLowerCase().includes(termo),
    );
  }

  const inicio = (pagina - 1) * limite;
  res.json({
    total: filtrados.length,
    pagina,
    limite,
    artigos: filtrados.slice(inicio, inicio + limite),
  });
});

// POST /api/v1/artigos — criar artigo
router.post("/", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const corpo: unknown = req.body;
  if (!eArtigoNovo(corpo)) {
    const problemas = problemasArtigo(corpo, false);
    res.status(400).json({ erro: `Corpo inválido. Verifica: ${problemas.join("; ")}.` });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  const novoId = artigos.reduce((maior, a) => Math.max(maior, a.id), 0) + 1;

  const artigo: Artigo = {
    id: novoId,
    titulo: corpo.titulo.trim(),
    texto: corpo.texto.trim(),
    estado: corpo.estado ?? "rascunho",
    jornalistaId,
  };

  artigos.push(artigo);
  await gravarDados("artigos.json", artigos);

  res.status(201)
    .location(`/api/v1/artigos/${artigo.id}`)
    .json(artigo);
});

// Valida :id em todas as rotas abaixo (sempre depois das rotas fixas)
router.use("/:id", validarId);

// GET /api/v1/artigos/:id — ver um artigo
router.get("/:id", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  const artigo = artigos.find((a) => a.id === Number(req.params.id));

  if (artigo === undefined) {
    res.status(404).json({ erro: `Não existe nenhum artigo com o id ${req.params.id}.` });
    return;
  }

  if (artigo.jornalistaId !== jornalistaId) {
    res.status(403).json({ erro: "Só podes aceder aos teus próprios artigos." });
    return;
  }

  res.json(artigo);
});

// PUT /api/v1/artigos/:id — substituir artigo completo
router.put("/:id", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const corpo: unknown = req.body;
  if (!eArtigoCompleto(corpo)) {
    const problemas = problemasArtigo(corpo, true);
    res.status(400).json({ erro: `Corpo inválido. Verifica: ${problemas.join("; ")}.` });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  const artigo = artigos.find((a) => a.id === Number(req.params.id));

  if (artigo === undefined) {
    res.status(404).json({ erro: `Não existe nenhum artigo com o id ${req.params.id}.` });
    return;
  }

  if (artigo.jornalistaId !== jornalistaId) {
    res.status(403).json({ erro: "Só podes alterar os teus próprios artigos." });
    return;
  }

  artigo.titulo = corpo.titulo.trim();
  artigo.texto = corpo.texto.trim();
  artigo.estado = corpo.estado;

  await gravarDados("artigos.json", artigos);
  res.json(artigo);
});

// PATCH /api/v1/artigos/:id — alterar parcialmente (ex.: só o estado)
router.patch("/:id", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const corpo: unknown = req.body;
  if (!eAlteracaoArtigo(corpo)) {
    const problemas = problemasAlteracaoArtigo(corpo);
    res.status(400).json({ erro: `Corpo inválido. Verifica: ${problemas.join("; ")}.` });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  const artigo = artigos.find((a) => a.id === Number(req.params.id));

  if (artigo === undefined) {
    res.status(404).json({ erro: `Não existe nenhum artigo com o id ${req.params.id}.` });
    return;
  }

  if (artigo.jornalistaId !== jornalistaId) {
    res.status(403).json({ erro: "Só podes alterar os teus próprios artigos." });
    return;
  }

  if (corpo.titulo !== undefined) artigo.titulo = corpo.titulo.trim();
  if (corpo.texto !== undefined) artigo.texto = corpo.texto.trim();
  if (corpo.estado !== undefined) artigo.estado = corpo.estado;

  await gravarDados("artigos.json", artigos);
  res.json(artigo);
});

// DELETE /api/v1/artigos/:id — apagar rascunho (artigo publicado devolve 409)
router.delete("/:id", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  const posicao = artigos.findIndex((a) => a.id === Number(req.params.id));

  if (posicao === -1) {
    res.status(404).json({ erro: `Não existe nenhum artigo com o id ${req.params.id}.` });
    return;
  }

  const artigo = artigos[posicao];
  if (artigo.jornalistaId !== jornalistaId) {
    res.status(403).json({ erro: "Só podes apagar os teus próprios artigos." });
    return;
  }

  if (artigo.estado === "publicado") {
    res.status(409).json({ erro: "Não é possível apagar um artigo publicado." });
    return;
  }

  artigos.splice(posicao, 1);
  await gravarDados("artigos.json", artigos);

  // remove fontes ligadas ao artigo apagado para não ficarem órfãs
  const fontes = await lerDados<Fonte>("fontes.json");
  const fontesRestantes = fontes.filter((f) => f.artigoId !== artigo.id);
  if (fontesRestantes.length !== fontes.length) {
    await gravarDados("fontes.json", fontesRestantes);
  }

  res.status(204).end();
});

export default router;