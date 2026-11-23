import { Router } from "express";
import { exigirApiKey } from "../middlewares/apiKey.ts";
import { lerDados } from "../utils/ficheiros.ts";
import type { Artigo, Fonte } from "../tipos.ts";

const router = Router();

router.get("/", exigirApiKey, async (req, res) => {
  const [artigos, fontes] = await Promise.all([
    lerDados<Artigo>("artigos.json"),
    lerDados<Fonte>("fontes.json"),
  ]);

  const rascunho = artigos.filter((a) => a.estado === "rascunho").length;
  const publicado = artigos.filter((a) => a.estado === "publicado").length;
  const arquivadas = fontes.filter((f) => f.arquivada).length;
  const naoArquivadas = fontes.filter((f) => !f.arquivada).length;

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
