import type { Artigo, Estado } from "../tipos.ts";

export type DadosArtigo = Omit<Artigo, "id" | "jornalistaId">; 
export type ArtigoNovo = Omit<DadosArtigo, "estado"> & { estado?: Estado };
export type AlteracaoArtigo = Partial<DadosArtigo>;

export function eEstado(valor: unknown): valor is Estado {
  return valor === "rascunho" || valor === "publicado";
}

export function problemasArtigo(x: unknown, exigirEstado = false): string[] {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return ["o body tem de ser um objeto JSON"];
  }

  const problemas: string[] = [];

  if (!("titulo" in x) || typeof x.titulo !== "string" || x.titulo.trim() === "") {
    problemas.push("titulo (texto, não vazio)");
  }

  if (!("texto" in x) || typeof x.texto !== "string" || x.texto.trim() === "") {
    problemas.push("texto (texto, não vazio)");
  }

  if (exigirEstado) {
    if (!("estado" in x) || !eEstado(x.estado)) {
      problemas.push('estado ("rascunho" ou "publicado")');
    }
  } else if ("estado" in x && x.estado !== undefined && !eEstado(x.estado)) {
    problemas.push('estado ("rascunho" ou "publicado")');
  }

  return problemas;
}

export function eArtigoNovo(x: unknown): x is ArtigoNovo {
  return problemasArtigo(x, false).length === 0;
}

export function eArtigoCompleto(x: unknown): x is DadosArtigo {
  return problemasArtigo(x, true).length === 0;
}

export function problemasAlteracaoArtigo(x: unknown): string[] {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return ["o body tem de ser um objeto JSON"];
  }

  const problemas: string[] = [];

  if ("titulo" in x && (typeof x.titulo !== "string" || x.titulo.trim() === "")) {
    problemas.push("titulo (texto, não vazio)");
  }

  if ("texto" in x && (typeof x.texto !== "string" || x.texto.trim() === "")) {
    problemas.push("texto (texto, não vazio)");
  }

  if ("estado" in x && !eEstado(x.estado)) {
    problemas.push('estado ("rascunho" ou "publicado")');
  }

  if (!("titulo" in x) && !("texto" in x) && !("estado" in x)) {
    problemas.push("pelo menos um campo para alterar (titulo, texto ou estado)");
  }

  return problemas;
}

export function eAlteracaoArtigo(x: unknown): x is AlteracaoArtigo {
  return problemasAlteracaoArtigo(x).length === 0;
}