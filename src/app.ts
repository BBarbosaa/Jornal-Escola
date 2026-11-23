// Ponto de configuração da API: associa os endereços às funções que os tratam.
// O servidor HTTPS é iniciado separadamente em servidor.ts.
import express from "express";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/erros.ts";
import authRotas from "./routes/auth.ts";
import jornalistasRotas from "./routes/jornalistas.ts";
import artigosRotas from "./routes/artigos.ts";
import fontesRotas from "./routes/fontes.ts";
import estatisticasRotas from "./routes/estatisticas.ts";

// Cria a aplicação Express. Um pedido percorre os middlewares pela ordem abaixo.
const app = express();

// Converte o corpo JSON recebido num objeto acessível através de req.body.
app.use(express.json());

// req é o pedido, res é a resposta e next permite continuar para o próximo middleware.
app.use((req, res, next) => {
  // HSTS pede aos browsers que respeitam esta política para usarem HTTPS durante um ano.
  // Não cria o HTTPS: a ligação segura é configurada em servidor.ts.
  res.setHeader("Strict-Transport-Security", "max-age=31536000");
  next();
});

// Rota simples para confirmar que a API responde. v1 identifica a versão da API.
app.get("/api/v1", (req, res) => {
  res.json({ mensagem: "API Fonte Segura" });
});

// Cada router trata apenas o caminho que vem depois deste prefixo.
// Exemplo: /auth + /login corresponde a /api/v1/auth/login.
app.use("/api/v1/auth", authRotas);
app.use("/api/v1/jornalistas", jornalistasRotas);
// :artigoId é um parâmetro dinâmico. As fontes são montadas antes das rotas de artigos.
app.use("/api/v1/artigos/:artigoId/fontes", fontesRotas);
app.use("/api/v1/artigos", artigosRotas);
app.use("/api/v1/estatisticas", estatisticasRotas);

// Estes têm de ficar no fim: primeiro o 404, depois o tratamento central de erros.
app.use(rotaNaoEncontrada);
app.use(tratarErros);

// Exportar permite ao servidor utilizar esta aplicação sem a configurar novamente.
export default app;
