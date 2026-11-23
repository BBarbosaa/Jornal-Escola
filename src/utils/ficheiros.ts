import { readFile, writeFile } from "node:fs/promises";

export async function lerDados<T>(ficheiro: string): Promise<T[]> {
  const conteudo = await readFile(`data/${ficheiro}`, "utf-8");
  return JSON.parse(conteudo) as T[];
}

export async function gravarDados<T>(ficheiro: string, dados: T[]): Promise<void> {
  await writeFile(`data/${ficheiro}`, JSON.stringify(dados, null, 2));
}
