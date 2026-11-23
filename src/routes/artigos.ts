// CRUD dos artigos: Create (POST), Read (GET), Update (PUT/PATCH) e Delete (DELETE).
// As rotas trabalham sobre artigos.json e só permitem aceder aos artigos do próprio autor.
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

// Todas as rotas deste router exigem um JWT válido, enviado como Bearer token.
router.use(autenticar);

// Confirma que o middleware deixou um id inteiro positivo no pedido.
// null indica que não conseguimos obter uma identidade válida.
function obterJornalistaId(req: Request): number | null {
  if (!("jornalistaId" in req)) {
    return null;
  }
  // Number converte para número; isInteger rejeita NaN e valores com casas decimais.
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

  // req.query contém os parâmetros depois de ?, por exemplo ?pagina=2&limite=5.
  // Como chegam do URL, convertemos para números e validamos antes de calcular posições.
  const pagina = Number(req.query.pagina ?? 1);
  const limite = Number(req.query.limite ?? 10);
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1) {
    res.status(400).json({ erro: "Os parâmetros pagina e limite têm de ser números inteiros maiores que 0." });
    return;
  }

  // Filtro opcional por estado: só aceita os dois valores definidos no modelo.
  const estado = req.query.estado;
  if (estado !== undefined && !eEstado(estado)) {
    res.status(400).json({ erro: 'O parâmetro estado tem de ser "rascunho" ou "publicado".' });
    return;
  }

  // A pesquisa tem de ser texto; rejeitamos outros formatos possíveis de query strings.
  const pesquisa = req.query.pesquisa;
  if (pesquisa !== undefined && typeof pesquisa !== "string") {
    res.status(400).json({ erro: "O parâmetro pesquisa tem de ser texto." });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  // Primeiro aplica a autorização: nenhum filtro permite ver artigos de outros autores.
  let filtrados = artigos.filter((a) => a.jornalistaId === jornalistaId);

  // Os filtros acumulam-se: estado e pesquisa são aplicados ao resultado anterior.
  if (estado !== undefined) {
    filtrados = filtrados.filter((a) => a.estado === estado);
  }

  if (pesquisa !== undefined && pesquisa.trim() !== "") {
    // Compara em minúsculas para ignorar diferenças de maiúsculas/minúsculas.
    // includes procura uma parte do texto, quer no título quer no conteúdo.
    const termo = pesquisa.trim().toLowerCase();
    filtrados = filtrados.filter(
      (a) => a.titulo.toLowerCase().includes(termo) || a.texto.toLowerCase().includes(termo),
    );
  }

  // Os arrays começam no índice 0: página 2 com limite 10 começa no índice 10.
  const inicio = (pagina - 1) * limite;
  res.json({
    // total conta todos os resultados filtrados, antes de selecionar esta página.
    total: filtrados.length,
    pagina,
    limite,
    // slice copia o intervalo sem alterar o array; o índice final não é incluído.
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

  // unknown obriga a validar os dados externos antes de os tratar como um artigo.
  const corpo: unknown = req.body;
  if (!eArtigoNovo(corpo)) {
    // A guarda responde true/false; esta função fornece os motivos para o erro 400.
    const problemas = problemasArtigo(corpo, false);
    res.status(400).json({ erro: `Corpo inválido. Verifica: ${problemas.join("; ")}.` });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  // reduce percorre o array guardando o maior id, começando em 0; depois soma 1.
  // Não usa length + 1, pois podem existir buracos nos ids após eliminações.
  const novoId = artigos.reduce((maior, a) => Math.max(maior, a.id), 0) + 1;

  // Escolhemos explicitamente os campos aceites. O cliente não define o id nem o autor.
  const artigo: Artigo = {
    id: novoId,
    titulo: corpo.titulo.trim(),
    texto: corpo.texto.trim(),
    // Se não vier estado, o artigo começa como rascunho; também aceita publicado na criação.
    estado: corpo.estado ?? "rascunho",
    // Abreviatura de jornalistaId: jornalistaId; é a identidade obtida do token.
    jornalistaId,
  };

  // Acrescenta ao array em memória e aguarda a gravação antes de responder ao cliente.
  artigos.push(artigo);
  await gravarDados("artigos.json", artigos);

  // 201 confirma a criação; Location indica o endereço do recurso criado.
  res.status(201)
    .location(`/api/v1/artigos/${artigo.id}`)
    .json(artigo);
});

// Valida :id em todas as rotas abaixo (sempre depois das rotas fixas)
// Esta validação só verifica o formato do parâmetro, não a existência nem o autor.
router.use("/:id", validarId);

// GET /api/v1/artigos/:id — ver um artigo
router.get("/:id", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const artigos = await lerDados<Artigo>("artigos.json");
  // params vem do caminho (/artigos/3); convertemos "3" para comparar com o id numérico.
  // find devolve o objeto encontrado ou undefined; a mesma procura é usada no PUT/PATCH.
  const artigo = artigos.find((a) => a.id === Number(req.params.id));

  // 404: o identificador é válido no formato, mas não corresponde a nenhum artigo.
  if (artigo === undefined) {
    res.status(404).json({ erro: `Não existe nenhum artigo com o id ${req.params.id}.` });
    return;
  }

  // 403: sabemos quem fez o pedido, mas esse jornalista não é o dono do recurso.
  // É autorização, diferente da autenticação feita pelo middleware (401).
  if (artigo.jornalistaId !== jornalistaId) {
    res.status(403).json({ erro: "Só podes aceder aos teus próprios artigos." });
    return;
  }

  res.json(artigo);
});

// PUT /api/v1/artigos/:id — substituir artigo completo
// PUT exige titulo, texto e estado. O id e a autoria mantêm-se.
router.put("/:id", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const corpo: unknown = req.body;
  // Verifica todos os campos obrigatórios de uma substituição completa.
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

  // O objeto devolvido por find é o mesmo que está no array; estas alterações afetam o array.
  // Só depois de confirmar existência e autoria é que alteramos o recurso.
  artigo.titulo = corpo.titulo.trim();
  artigo.texto = corpo.texto.trim();
  artigo.estado = corpo.estado;

  await gravarDados("artigos.json", artigos);
  res.json(artigo);
});

// PATCH /api/v1/artigos/:id — alterar parcialmente (ex.: só o estado)
// Exemplo de body: { "estado": "publicado" }. O título e o texto ficam como estavam.
// A implementação também permite voltar de publicado para rascunho.
router.patch("/:id", async (req, res) => {
  const jornalistaId = obterJornalistaId(req);
  if (jornalistaId === null) {
    res.status(401).json({ erro: "Autenticação necessária." });
    return;
  }

  const corpo: unknown = req.body;
  // Exige pelo menos um campo reconhecido e valida apenas os campos enviados.
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

  // Campos ausentes não são substituídos por undefined nem apagados.
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
  // Para apagar precisamos da posição, não só do objeto. findIndex devolve -1 se não encontrar.
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

  // Regra de negócio: não permite apagar um artigo enquanto estiver publicado.
  // 409 significa conflito com o estado atual do recurso.
  if (artigo.estado === "publicado") {
    res.status(409).json({ erro: "Não é possível apagar um artigo publicado." });
    return;
  }

  // splice remove 1 elemento a partir da posição encontrada e altera o próprio array.
  artigos.splice(posicao, 1);
  await gravarDados("artigos.json", artigos);

  // remove fontes ligadas ao artigo apagado para não ficarem órfãs
  const fontes = await lerDados<Fonte>("fontes.json");
  // Eliminação em cascata feita manualmente: mantém apenas fontes de outros artigos.
  // Os dois ficheiros são gravados separadamente; não existe uma transação conjunta.
  const fontesRestantes = fontes.filter((f) => f.artigoId !== artigo.id);
  // Evita regravar fontes.json quando nenhuma fonte foi removida.
  if (fontesRestantes.length !== fontes.length) {
    await gravarDados("fontes.json", fontesRestantes);
  }

  // 204 confirma a eliminação e, por definição, não tem corpo JSON.
  res.status(204).end();
});

export default router;
