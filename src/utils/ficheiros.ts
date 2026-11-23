// Persistência simples em ficheiros JSON. fs/promises fornece operações assíncronas.
// Os caminhos são relativos à pasta onde o processo Node foi iniciado.
// Limite: ler-alterar-gravar não é uma transação; pedidos simultâneos podem perder alterações.
import { readFile, writeFile } from "node:fs/promises";

// T é um genérico: permite reutilizar a leitura para Artigo, Fonte ou Jornalista.
// Exemplo: lerDados<Artigo>("artigos.json") devolve uma Promise de Artigo[].
export async function lerDados<T>(ficheiro: string): Promise<T[]> {
  const conteudo = await readFile(`data/${ficheiro}`, "utf-8");
  // parse transforma texto JSON em dados JavaScript.
  // "as T[]" não valida o ficheiro: apenas indica ao TypeScript a estrutura esperada.
  // Se faltar o ficheiro ou o JSON estiver inválido, a promise é rejeitada.
  return JSON.parse(conteudo) as T[];
}

// Substitui o conteúdo inteiro do ficheiro pelo estado atual do array.
export async function gravarDados<T>(ficheiro: string, dados: T[]): Promise<void> {
  // stringify converte objetos em JSON; null não aplica transformação; 2 indenta com dois espaços.
  await writeFile(`data/${ficheiro}`, JSON.stringify(dados, null, 2));
}
