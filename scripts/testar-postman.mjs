// Executa a coleção em dados temporários, sem tocar nos ficheiros data/ do grupo.
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { criarMockArquivo } from './arquivo-mock.mjs';
import app from '../src/app.ts';
import newman from 'newman';
import { readFileSync } from 'node:fs';

const colecao = JSON.parse(readFileSync(new URL('../postman/Pessoa4.postman_collection.json', import.meta.url), 'utf8'));
const diretorioOriginal = process.cwd();
const temporario = await mkdtemp(join(tmpdir(), 'jornal-pessoa4-'));
const mock = criarMockArquivo();
const servidor = app.listen();
try {
  await mkdir(join(temporario, 'data'));
  for (const ficheiro of ['artigos', 'fontes', 'jornalistas']) {
    await writeFile(join(temporario, 'data', `${ficheiro}.json`), '[]');
  }
  process.chdir(temporario);
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.CHAVE_ENCRIPTACAO = randomBytes(32).toString('hex');
  process.env.API_KEY = randomBytes(32).toString('hex');
  process.env.ARQUIVO_TIMEOUT_MS = '500';
  await new Promise((resolve, reject) => { mock.once('error', reject); mock.listen(0, '127.0.0.1', resolve); });
  if (!servidor.listening) await new Promise(resolve => servidor.once('listening', resolve));
  process.env.ARQUIVO_URL = `http://127.0.0.1:${mock.address().port}/textsearch`;
  for (let repeticao = 1; repeticao <= 2; repeticao++) {
    console.log(`\nExecução ${repeticao}/2 da coleção (mesmos ficheiros temporários)`);
    const resultado = await new Promise((resolve, reject) => newman.run({
      collection: structuredClone(colecao),
      environment: { values: [
        { key: 'baseUrl', value: `http://localhost:${servidor.address().port}/api/v1` },
        { key: 'apiKey', value: process.env.API_KEY },
      ] },
      reporters: ['cli'],
    }, (erro, resumo) => erro ? reject(erro) : resolve(resumo)));
    if (resultado.run.failures.length) process.exitCode = 1;
    for (const ficheiro of ['artigos', 'fontes', 'jornalistas']) {
      assert.deepEqual(JSON.parse(await readFile(`data/${ficheiro}.json`, 'utf8')), [],
        `A coleção deve limpar ${ficheiro}.json, incluindo fontes eliminadas em cascata.`);
    }
  }
} finally {
  servidor.closeAllConnections();
  mock.closeAllConnections();
  await Promise.all([promisify(servidor.close.bind(servidor))(), promisify(mock.close.bind(mock))()]);
  process.chdir(diretorioOriginal);
  await rm(temporario, { recursive: true, force: true });
}
