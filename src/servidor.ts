// Arranque da aplicação: cria a ligação HTTPS e começa a receber pedidos.
import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import app from "./app.ts";

// process.env contém variáveis de ambiente, incluindo as carregadas do .env pelo Node.
// ?? usa o valor à direita apenas quando o valor à esquerda é null ou undefined.
const PORT = process.env.PORT ?? 3000;

// HTTPS precisa de uma chave privada e de um certificado que identifica o servidor.
// readFileSync lê de forma síncrona: aqui acontece uma vez, antes de aceitar pedidos.
// Se os ficheiros não existirem, o arranque falha nesta leitura.
const opcoes = {
  key: readFileSync(process.env.SSL_KEY ?? "certs/key.pem"),
  cert: readFileSync(process.env.SSL_CERT ?? "certs/cert.pem"),
};

// O HTTPS protege a comunicação; o Express decide como responder a cada pedido.
const servidor = createServer(opcoes, app);

// Trata erros emitidos pelo servidor, por exemplo uma porta já ocupada.
servidor.on("error", (erro) => {
  console.log(`Não foi possível arrancar na porta ${PORT}: ${erro.message}`);
  // Código de saída 1 indica que o processo terminou com erro.
  process.exit(1);
});

// listen começa a aceitar ligações. A função é executada quando o servidor fica pronto.
servidor.listen(PORT, () => {
  console.log(`Servidor HTTPS a correr em https://localhost:${PORT}`);
});
