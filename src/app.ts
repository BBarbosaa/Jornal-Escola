import express from "express";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/erros.ts";
import authRotas from "./routes/auth.ts";
import jornalistasRotas from "./routes/jornalistas.ts";
import artigosRotas from "./routes/artigos.ts";
import fontesRotas from "./routes/fontes.ts";
import estatisticasRotas from "./routes/estatisticas.ts";

const app = express();

app.use(express.json());

app.get("/api/v1", (req, res) => {
  res.json({ mensagem: "API Fonte Segura" });
});

app.use("/api/v1/auth", authRotas);
app.use("/api/v1/jornalistas", jornalistasRotas);
app.use("/api/v1/artigos/:artigoId/fontes", fontesRotas);
app.use("/api/v1/artigos", artigosRotas);
app.use("/api/v1/estatisticas", estatisticasRotas);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

export default app;