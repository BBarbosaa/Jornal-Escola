import { Router } from "express";
import type { Request, Response } from "express";
import { autenticar } from "../middlewares/autenticacao.ts";
import { validarId } from "../middlewares/validarId.ts";
import { lerDados, gravarDados } from "../utils/ficheiros.ts";
import { eFonteValida } from "../utils/validarFonte.ts";
import { consultarArquivo } from "../services/arquivo.ts";
import type { Artigo, Fonte } from "../tipos.ts";

// mergeParams disponibiliza neste router os parâmetros do router pai, como artigoId.
// Por defeito, os parâmetros do pai não são preservados num router filho.
const router = Router({ mergeParams: true });

router.use(autenticar);

// O JWT é obrigatório também para listar fontes. Primeiro verifica-se o artigo pai.
router.use(async (req, res, next) => {
  const id = req.params.artigoId;
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    res.status(400).json({ erro: "O artigoId deve ser um inteiro positivo." });
    return;
  }
  const artigos = await lerDados<Artigo>("artigos.json");
  const artigo = artigos.find((a) => a.id === Number(id));
  if (!artigo) {
    res.status(404).json({ erro: "Artigo não encontrado." });
    return;
  }
  if (artigo.jornalistaId !== req.jornalistaId) {
    res.status(403).json({ erro: "Só podes aceder às fontes dos teus próprios artigos." });
    return;
  }
  res.locals.artigoId = artigo.id;
  next();
});

router.get("/", async (req, res) => {
  const fontes = await lerDados<Fonte>("fontes.json");
  res.json(fontes.filter((f) => f.artigoId === Number(res.locals.artigoId)));
});

router.post("/", async (req, res) => {
  const corpo: unknown = req.body;
  if (!eFonteValida(corpo)) {
    res.status(400).json({ erro: "Envia apenas um url válido com protocolo http ou https, sem credenciais." });
    return;
  }
  const url = corpo.url.trim();
  const resultado = await consultarArquivo(url);
  if (!resultado.ok) {
    res.status(502).json({ erro: resultado.erro });
    return;
  }
  // Só lemos e gravamos depois da consulta: uma falha externa não cria uma fonte.
  const fontes = await lerDados<Fonte>("fontes.json");
  const fonte: Fonte = {
    id: fontes.reduce((maior, f) => Math.max(maior, f.id), 0) + 1,
    artigoId: Number(res.locals.artigoId),
    url,
    ...resultado.dados,
  };
  fontes.push(fonte);
  await gravarDados("fontes.json", fontes);
  res.status(201).location(`/api/v1/artigos/${fonte.artigoId}/fontes/${fonte.id}`).json(fonte);
});

router.use("/:id", validarId);

router.get("/:id", async (req, res) => {
  const fontes = await lerDados<Fonte>("fontes.json");
  const fonte = fontes.find((f) => f.id === Number(req.params.id) && f.artigoId === Number(res.locals.artigoId));
  if (!fonte) {
    res.status(404).json({ erro: "Fonte não encontrada neste artigo." });
    return;
  }
  res.json(fonte);
});

// Como a fonte só tem um campo editável, PUT e PATCH exigem ambos { url }.
router.route("/:id").put(alterarFonte).patch(alterarFonte);

async function alterarFonte(req: Request, res: Response): Promise<void> {
  const corpo: unknown = req.body;
  if (!eFonteValida(corpo)) {
    res.status(400).json({ erro: "Envia apenas um url válido com protocolo http ou https, sem credenciais." });
    return;
  }
  const artigoId = Number(res.locals.artigoId);
  const id = Number(req.params.id);
  const fontes = await lerDados<Fonte>("fontes.json");
  const fonte = fontes.find((f) => f.id === id && f.artigoId === artigoId);
  if (!fonte) {
    res.status(404).json({ erro: "Fonte não encontrada neste artigo." });
    return;
  }
  const url = corpo.url.trim();
  // Repetir um PUT com o mesmo URL mantém a representação guardada.
  if (url === fonte.url) {
    res.json(fonte);
    return;
  }
  const resultado = await consultarArquivo(url);
  if (!resultado.ok) {
    res.status(502).json({ erro: resultado.erro });
    return;
  }
  // Relê após a chamada externa para evitar gravar uma cópia antiga de outras fontes.
  const atuais = await lerDados<Fonte>("fontes.json");
  const atual = atuais.find((f) => f.id === id && f.artigoId === artigoId);
  if (!atual) {
    res.status(404).json({ erro: "Fonte não encontrada neste artigo." });
    return;
  }
  Object.assign(atual, { url }, resultado.dados);
  await gravarDados("fontes.json", atuais);
  res.json(atual);
}

router.delete("/:id", async (req, res) => {
  const fontes = await lerDados<Fonte>("fontes.json");
  const posicao = fontes.findIndex((f) => f.id === Number(req.params.id) && f.artigoId === Number(res.locals.artigoId));
  if (posicao === -1) {
    res.status(404).json({ erro: "Fonte não encontrada neste artigo." });
    return;
  }
  fontes.splice(posicao, 1);
  await gravarDados("fontes.json", fontes);
  res.status(204).end();
});

export default router;
