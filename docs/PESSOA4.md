# Pessoa 4: fontes, Arquivo.pt e testes

A tua parte já está implementada neste projeto. Este guia explica a ordem de estudo e os passos para executar e demonstrar o código. As rotas usam a autenticação e os ficheiros JSON existentes no trabalho do grupo.

## 1. Confirmar o que pertence à tua parte

| Ficheiro | Responsabilidade |
| --- | --- |
| `src/tipos.ts` | Modelo `Fonte`, já preparado pelo grupo |
| `src/utils/validarFonte.ts` | Validar o corpo do pedido e o URL |
| `src/services/arquivo.ts` | Consultar o Arquivo.pt com `fetch` e timeout |
| `src/routes/fontes.ts` | CRUD, autorização, respostas e persistência |
| `scripts/arquivo-mock.mjs` | Simular respostas externas para os testes |
| `postman/Pessoa4.postman_collection.json` | Coleção importável com testes automáticos |
| `postman/Local.postman_environment.json` | Ambiente local sem segredos preenchidos |
| `scripts/testar-postman.mjs` | Executar a coleção duas vezes com dados temporários |

No `src/app.ts`, a montagem já existia:

```ts
app.use("/api/v1/artigos/:artigoId/fontes", fontesRotas);
```

O nome interno `:artigoId` corresponde ao `:id` do artigo referido na divisão de tarefas. O endereço utilizado pelo cliente é, por exemplo, `/api/v1/artigos/1/fontes`.

## 2. Entender os dados da fonte

```ts
export interface Fonte {
  id: number;
  url: string;
  artigoId: number;
  arquivada: boolean;
  linkArquivo: string | null;
  dataArquivo: string | null;
}
```

O cliente só envia o `url`. O servidor escolhe `id` e `artigoId` e obtém os restantes campos no Arquivo.pt. Uma fonte sem resultados fica com `arquivada: false`, `linkArquivo: null` e `dataArquivo: null`.

O `data/fontes.json` deve conter um array JSON, inicialmente `[]`. Não apagues dados que os colegas já tenham criado.

## 3. Estudar a validação

Abre [`validarFonte.ts`](../src/utils/validarFonte.ts). A função começa com `unknown`, confirma que recebeu um objeto e verifica se tem apenas o campo `url`.

```json
{ "url": "https://www.atec.pt" }
```

São rejeitados corpos vazios, arrays, URLs sem protocolo, protocolos diferentes de HTTP/HTTPS, credenciais dentro do URL e campos como `arquivada` enviados pelo cliente. A resposta é `400` com `{ "erro": "..." }`.

`new URL(...)` valida a estrutura do endereço; não confirma se a página existe. O servidor não visita diretamente esse endereço: envia-o como parâmetro de pesquisa ao Arquivo.pt.

## 4. Estudar a integração

Abre [`arquivo.ts`](../src/services/arquivo.ts). O pedido segue a rota indicada no enunciado recuperado:

```text
https://arquivo.pt/textsearch?versionHistory={url}&maxItems=1&fields=tstamp,linkToArchive
```

No código, `URL.searchParams` codifica o URL original, incluindo caracteres como `?` e `&`:

```ts
endpoint.searchParams.set("versionHistory", urlOriginal);
endpoint.searchParams.set("maxItems", "1");
endpoint.searchParams.set("fields", "tstamp,linkToArchive");
const resposta = await fetch(endpoint, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(timeout),
});
```

A [documentação oficial do Arquivo.pt](https://github.com/arquivo/pwa-technologies/wiki/Arquivo.pt-API) indica que `versionHistory` lista as versões da mais recente para a mais antiga. Também informa que `fields` não se aplica à pesquisa por URL; mantivemos esse parâmetro para corresponder à rota do enunciado e validamos os dois campos usados.

| Resposta externa | Resultado da nossa API |
| --- | --- |
| `response_items` com versão válida | Guarda link e data, `arquivada: true` |
| `response_items: []` | Guarda a fonte como não arquivada |
| HTTP de erro, timeout ou rede indisponível | `502`, sem gravar a alteração |
| JSON, estrutura, link ou data inválidos | `502`, sem gravar a alteração |

O `tstamp` tem o formato `AAAAMMDDhhmmss`. Por exemplo, `20260102123456` é guardado como `2026-01-02T12:34:56.000Z`. É a data da versão arquivada, não o momento em que juntaste a fonte.

A função devolve uma união de resultados:

```ts
type ResultadoArquivo =
  | { ok: true; dados: DadosArquivo }
  | { ok: false; erro: string };
```

Assim, a rota tem de verificar `resultado.ok` antes de usar os dados. Os problemas de configuração do servidor continuam a ser erros internos; os problemas da consulta externa resultam em `502`.

## 5. Estudar o CRUD e a autorização

Abre [`fontes.ts`](../src/routes/fontes.ts). `Router({ mergeParams: true })` disponibiliza o parâmetro `artigoId` do caminho montado em `app.ts`.

A ordem é: validar JWT, validar identificador do artigo, procurar artigo, confirmar autor e executar a operação. A fonte também tem de pertencer ao artigo indicado no URL.

| Método | Caminho após `/api/v1` | Sucesso |
| --- | --- | --- |
| GET | `/artigos/:artigoId/fontes` | `200`, array de fontes |
| POST | `/artigos/:artigoId/fontes` | `201`, fonte e header `Location` |
| GET | `/artigos/:artigoId/fontes/:id` | `200`, uma fonte |
| PUT | `/artigos/:artigoId/fontes/:id` | `200`, substitui o URL editável |
| PATCH | `/artigos/:artigoId/fontes/:id` | `200`, altera o URL editável |
| DELETE | `/artigos/:artigoId/fontes/:id` | `204`, sem corpo |

PUT e PATCH recebem `{ "url": "https://..." }`, pois esse é o único campo editável. Alterar o URL consulta novamente o Arquivo.pt e substitui os metadados. Repetir o mesmo URL mantém a representação guardada.

Sem JWT ou com JWT inválido: `401`. Artigo de outro jornalista: `403`. Artigo inexistente, fonte inexistente ou fonte associada a outro artigo: `404`.

A regra `409` para apagar um artigo publicado pertence ao router de artigos da pessoa 3. A coleção testa essa integração. Apagar uma fonte não está sujeito a essa regra.

## 6. Instalar e verificar

Na pasta do projeto, em PowerShell:

```powershell
npm.cmd install
npm.cmd run verificar
npm.cmd test
```

`npm.cmd` evita problemas da política de execução do PowerShell com `npm.ps1`.

`npm test` inicia a aplicação e o simulador em portas livres. Cria ficheiros de dados numa pasta temporária, gera segredos de teste e executa a coleção duas vezes com Newman. Não necessita de `.env` nem de certificados e não altera os ficheiros `data/` do grupo. Usa HTTP em loopback para verificar o comportamento da API; a configuração HTTPS de `src/servidor.ts` é verificada separadamente ao arrancar o servidor normal.

Na validação realizada: **51 pedidos e 114 verificações por execução, duas execuções, zero falhas**.

## 7. Executar no Postman Runner com HTTPS

1. Se ainda não existir, copia `.env.exemplo` para `.env` e preenche `JWT_SECRET`, `CHAVE_ENCRIPTACAO` e `API_KEY` conforme o README. Mantém os segredos já usados pelo grupo para conseguir desencriptar os telefones existentes.
2. Para esta execução controlada, configura no `.env`:

   ```dotenv
   ARQUIVO_URL=http://127.0.0.1:4010/textsearch
   ARQUIVO_TIMEOUT_MS=500
   ```

3. Num terminal, inicia o simulador:

   ```powershell
   npm.cmd run mock:arquivo
   ```

4. Confirma com a pessoa 1 que existem `certs/key.pem` e `certs/cert.pem`, conforme o README. Noutro terminal, inicia a API HTTPS:

   ```powershell
   npm.cmd start
   ```

5. Importa a coleção e o ambiente da pasta `postman/`.
6. Seleciona o ambiente **Jornal — testes locais com mock**. Confirma `baseUrl=https://localhost:3000/api/v1` e preenche `apiKey` com o valor do `.env`.
7. Nas definições de certificados do Postman, adiciona `certs/cert.pem` como certificado de confiança. Mantém a verificação SSL ligada.
8. Abre **Run collection**, seleciona todos os pedidos e mantém a ordem. Executa com uma iteração; repete para comprovar que os dados de teste são limpos.

O primeiro pedido cria um email único. O login guarda automaticamente o token no ambiente:

```js
pm.environment.set("token", pm.response.json().token);
pm.test("Token recebido", () => {
  pm.expect(pm.response.json().token).to.be.a("string").and.not.empty;
});
```

A coleção usa **Bearer Token: `{{token}}`**, herdado pelos pedidos protegidos. Registo e login usam **No Auth**. O pedido de estatísticas usa **API Key**, com o header `x-api-key` e o valor `{{apiKey}}`.

Os testes verificam `200`, `201`, `400`, `401`, `404`, `409` e `502`, além de `204` e `403`. Validam JSON, `Location`, metadados, autorização, timeout e preservação dos dados depois de um `502`. No fim eliminam as contas e artigos criados pela execução. Não exportes o ambiente com tokens ou chaves reais preenchidos.

## 8. Demonstrar o Arquivo.pt real

O simulador permite reproduzir falhas sem depender da disponibilidade de um serviço externo. Para a demonstração real, volta a configurar:

```dotenv
ARQUIVO_URL=https://arquivo.pt/textsearch
ARQUIVO_TIMEOUT_MS=5000
```

Reinicia a API. Faz login, cria um artigo teu e envia manualmente, trocando `1` pelo id recebido:

```http
POST https://localhost:3000/api/v1/artigos/1/fontes
Authorization: Bearer <token recebido no login>
Content-Type: application/json

{ "url": "https://www.atec.pt" }
```

Confirma o resultado no Postman e em `data/fontes.json`. Não executes a coleção de cenários simulados contra o serviço real: as URLs `/falha` e `/timeout` só têm significado no simulador. A disponibilidade e os resultados atuais do Arquivo.pt não foram verificados na execução automatizada.

## 9. Preparar o relatório e a defesa

Usa [`RELATORIO-PESSOA4.md`](RELATORIO-PESSOA4.md) como proposta da tua secção. Acrescenta as capturas do Runner e da consulta real depois de as realizares.

Deves conseguir explicar:

- `mergeParams`: permite ler o id do artigo dentro do router das fontes.
- Autenticação: valida o JWT; autorização: confirma que o artigo pertence ao jornalista.
- `unknown`: exige validar os dados externos antes de lhes aceder.
- Sem resultados: a consulta funcionou, mas não encontrou versões; a fonte fica não arquivada.
- `502`: a API dependeu de outro serviço e essa consulta falhou.
- Timeout: limita o tempo de espera pelo serviço externo.
- Gravação após consulta: impede persistir uma fonte quando a integração falha.
- Limitação do JSON: leituras e escritas não são transações; pedidos simultâneos podem perder alterações, como já acontece na persistência base do grupo.

## Materiais consultados

- [Enunciado do projeto](<C:/Users/Utilizador/Downloads/UC00614 - Projeto - Jornal da Escola.pdf>): o ficheiro disponibilizado está truncado; foi possível recuperar o texto da primeira página, incluindo a rota e os três resultados esperados da integração. A segunda página não pôde ser consultada.
- [REST](<C:/Users/Utilizador/Downloads/UC00614 - REST - 04 1.pdf>): routers, middleware, códigos HTTP, JSON e testes de coleção.
- [Segurança](<C:/Users/Utilizador/Downloads/UC00614 - Segurança - 05 1.pdf>): JWT no Postman, API key e confiança no certificado HTTPS.
- [TypeScript](<C:/Users/Utilizador/Downloads/UC00614 - TypeScript - 03 1.pdf>): `unknown`, validação, narrowing e união de resultados.
