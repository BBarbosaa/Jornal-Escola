import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import app from "./app.ts";

const PORT = process.env.PORT || 3000;

const opcoes = {
  key: readFileSync(process.env.SSL_KEY || "certs/key.pem"),
  cert: readFileSync(process.env.SSL_CERT || "certs/cert.pem"),
};

createServer(opcoes, app).listen(PORT, () => {
  console.log(`Servidor HTTPS a correr em https://localhost:${PORT}`);
});