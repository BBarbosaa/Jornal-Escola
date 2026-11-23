# Fontes, integração com o Arquivo.pt e testes

Foi implementado o CRUD de fontes na hierarquia `/api/v1/artigos/:artigoId/fontes`. Cada fonte contém o URL original, o identificador do artigo e os metadados de arquivo. O router exige um JWT válido e confirma que o artigo pertence ao jornalista autenticado. A procura de uma fonte inclui também o identificador do artigo, impedindo o acesso através de outro artigo.

Os dados recebidos são validados em execução. O cliente só pode definir o URL, que deve usar HTTP ou HTTPS e não conter credenciais. Os identificadores, a associação ao artigo e os metadados do Arquivo.pt são definidos pelo servidor. A criação responde com `201` e `Location`; a leitura e alteração respondem com `200`; a eliminação responde com `204`, sem corpo.

A integração está isolada em `src/services/arquivo.ts` e usa o `fetch` nativo do Node.js. A consulta envia o URL no parâmetro `versionHistory` e pede uma versão. O timeout é configurável através de `ARQUIVO_TIMEOUT_MS`, com um valor de cinco segundos por omissão. A resposta externa é tratada como `unknown` e validada antes de ser usada.

Quando existe uma versão válida, são guardados o link arquivado e a data dessa versão, convertida de `AAAAMMDDhhmmss` para ISO 8601 em UTC. Quando a lista de versões está vazia, a fonte é guardada com `arquivada: false` e metadados nulos. Erros HTTP externos, falhas de rede, timeout ou respostas inválidas originam `502` em JSON. A consulta ocorre antes da gravação: uma falha externa não cria a fonte nem altera uma fonte existente. Alterar o URL renova os metadados.

Foi criada uma coleção Postman com 51 pedidos. O registo gera emails únicos e o login guarda automaticamente o JWT no ambiente. Os pedidos protegidos herdam a autenticação Bearer da coleção; as estatísticas usam uma API key no header `x-api-key`. A coleção inclui os códigos `200`, `201`, `400`, `401`, `404`, `409` e `502`, além de `204` e `403`.

Para reproduzir sucesso, ausência de versões e falhas, foi criado um simulador HTTP independente do Arquivo.pt. A aplicação continua a executar o serviço real de integração através de `fetch`, incluindo a validação e o timeout. Os testes confirmam os metadados guardados, o isolamento entre jornalistas, a associação entre fonte e artigo, a preservação dos dados após um `502` e a capacidade de continuar a responder.

A coleção foi executada duas vezes com Newman, com 114 verificações por execução e zero falhas. O comando `npm test` utiliza dados e segredos temporários e HTTP em loopback; não testa o arranque HTTPS nem a disponibilidade atual do Arquivo.pt real. A demonstração manual por HTTPS e a consulta real devem ser documentadas com os respetivos resultados antes da entrega.

A persistência em ficheiros JSON reutiliza a infraestrutura do grupo. Não existe uma transação entre leitura e escrita; pedidos concorrentes podem provocar perda de alterações. Uma evolução futura seria serializar as operações ou adotar uma base de dados com transações.

Contribuição da pessoa 4: CRUD e validação de fontes, autorização sobre o artigo pai, serviço Arquivo.pt com timeout, simulador externo, coleção e ambiente Postman e execução automática com Newman.
