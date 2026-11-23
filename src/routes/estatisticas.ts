// Estatísticas globais dos ficheiros, sem limitar os resultados a um jornalista.
import { Router } from "express";
import { exigirApiKey } from "../middlewares/apiKey.ts";
import { lerDados } from "../utils/ficheiros.ts";
import type { Artigo, Fonte } from "../tipos.ts";

const router = Router();

// GET /api/v1/estatisticas: exige x-api-key, em vez de usar o middleware JWT.
// exigirApiKey corre antes da função async e só a deixa executar se chamar next().
router.get("/", exigirApiKey, async (req, res) => {
  // As leituras são independentes; Promise.all aguarda ambas em conjunto.
  // A desestruturação atribui os resultados pela ordem das promises, não pela de conclusão.
  const [artigos, fontes] = await Promise.all([
    lerDados<Artigo>("artigos.json"),
    lerDados<Fonte>("fontes.json"),
  ]);

  // filter seleciona os registos e length conta quantos passaram em cada condição.
  const rascunho = artigos.filter((a) => a.estado === "rascunho").length;
  const publicado = artigos.filter((a) => a.estado === "publicado").length;
  const arquivadas = fontes.filter((f) => f.arquivada).length;
  const naoArquivadas = fontes.filter((f) => !f.arquivada).length;

  // Devolve apenas contagens agrupadas, sem os textos dos artigos ou dados dos jornalistas.
  res.json({
    artigos: {
      total: artigos.length,
      rascunho,
      publicado,
    },
    fontes: {
      total: fontes.length,
      arquivadas,
      naoArquivadas,
    },
  });
});

export default router;
