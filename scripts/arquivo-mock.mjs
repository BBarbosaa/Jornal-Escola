// Simulador independente: a API continua a usar fetch, timeout e validação reais.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export function criarMockArquivo() {
  return createServer((req, res) => {
    const pedido = new URL(req.url, 'http://localhost');
    const original = pedido.searchParams.get('versionHistory');
    res.setHeader('Content-Type', 'application/json');
    if (pedido.pathname !== '/textsearch' || !original || pedido.searchParams.get('maxItems') !== '1' ||
        pedido.searchParams.get('fields') !== 'tstamp,linkToArchive') {
      res.writeHead(400).end(JSON.stringify({ erro: 'Consulta inválida.' }));
      return;
    }
    const caminho = new URL(original).pathname;
    if (caminho === '/falha') {
      res.writeHead(503).end(JSON.stringify({ erro: 'Falha externa simulada.' }));
    } else if (caminho === '/timeout') {
      const temporizador = setTimeout(() => res.end(JSON.stringify({ response_items: [] })), 10000);
      res.on('close', () => clearTimeout(temporizador));
    } else if (caminho === '/json-invalido') {
      res.end('{');
    } else if (caminho === '/formato-invalido') {
      res.end(JSON.stringify({ resultados: [] }));
    } else if (caminho === '/data-invalida') {
      res.end(JSON.stringify({ response_items: [{ linkToArchive: 'https://arquivo.pt/wayback/20260230000000/https://exemplo.pt', tstamp: '20260230000000' }] }));
    } else if (caminho === '/sem-arquivo') {
      res.end(JSON.stringify({ response_items: [] }));
    } else {
      res.end(JSON.stringify({ response_items: [{
        tstamp: '20260102123456',
        linkToArchive: `https://arquivo.pt/wayback/20260102123456/${original}`,
      }] }));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  criarMockArquivo().listen(4010, '127.0.0.1', () => console.log('Mock em http://127.0.0.1:4010/textsearch'));
}
