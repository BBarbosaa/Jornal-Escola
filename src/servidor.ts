import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import app from "./app.ts";

const PORT = process.env.PORT ?? 3000;

const opcoes = {
  key: readFileSync(process.env.SSL_KEY ?? "certs/key.pem"),
  cert: readFileSync(process.env.SSL_CERT ?? "certs/cert.pem"),
};

const servidor = createServer(opcoes, app);

servidor.on("error", (erro) => {
  console.log(`Não foi possível arrancar na porta ${PORT}: ${erro.message}`);
  process.exit(1);
});

servidor.listen(PORT, () => {
  console.log(`Servidor HTTPS a correr em https://localhost:${PORT}`);
});
