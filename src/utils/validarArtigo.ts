// Valida os corpos de criação, substituição e alteração parcial de artigos em execução.
import type { Artigo, Estado } from "../tipos.ts";

// Omit retira campos de um tipo: id e jornalistaId são definidos pelo servidor.
export type DadosArtigo = Omit<Artigo, "id" | "jornalistaId">; 
// & combina tipos; ? torna estado opcional na criação (assume rascunho na rota).
export type ArtigoNovo = Omit<DadosArtigo, "estado"> & { estado?: Estado };
// Partial torna todos os campos opcionais para o PATCH.
// A exigência de pelo menos um campo é verificada abaixo, em execução.
export type AlteracaoArtigo = Partial<DadosArtigo>;

// "valor is Estado" é um predicado de tipo, que ajuda o TypeScript após a verificação.
export function eEstado(valor: unknown): valor is Estado {
  return valor === "rascunho" || valor === "publicado";
}

// Validação partilhada: POST não exige estado; PUT exige estado (exigirEstado = true).
export function problemasArtigo(x: unknown, exigirEstado = false): string[] {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return ["o body tem de ser um objeto JSON"];
  }

  // Um array vazio no fim significa que não foram encontrados problemas.
  const problemas: string[] = [];

  // "in" verifica a presença da propriedade; trim impede títulos só com espaços.
  // || interrompe a avaliação assim que encontra um problema, evitando usar trim em não-texto.
  if (!("titulo" in x) || typeof x.titulo !== "string" || x.titulo.trim() === "") {
    problemas.push("titulo (texto, não vazio)");
  }

  if (!("texto" in x) || typeof x.texto !== "string" || x.texto.trim() === "") {
    problemas.push("texto (texto, não vazio)");
  }

  // PUT exige os três campos; POST permite omitir estado, mas valida-o se for enviado.
  if (exigirEstado) {
    if (!("estado" in x) || !eEstado(x.estado)) {
      problemas.push('estado ("rascunho" ou "publicado")');
    }
  } else if ("estado" in x && x.estado !== undefined && !eEstado(x.estado)) {
    problemas.push('estado ("rascunho" ou "publicado")');
  }

  return problemas;
}

// As guardas seguintes convertem o resultado dos validadores em true/false e refinam o tipo.
export function eArtigoNovo(x: unknown): x is ArtigoNovo {
  return problemasArtigo(x, false).length === 0;
}

// true no segundo argumento ativa a obrigatoriedade do estado para o PUT.
export function eArtigoCompleto(x: unknown): x is DadosArtigo {
  return problemasArtigo(x, true).length === 0;
}

// PATCH permite enviar só titulo, só texto, só estado ou uma combinação destes.
export function problemasAlteracaoArtigo(x: unknown): string[] {
  if (typeof x !== "object" || x === null || Array.isArray(x)) {
    return ["o body tem de ser um objeto JSON"];
  }

  const problemas: string[] = [];

  // && valida o conteúdo apenas se o campo existir; um campo ausente não será alterado.
  if ("titulo" in x && (typeof x.titulo !== "string" || x.titulo.trim() === "")) {
    problemas.push("titulo (texto, não vazio)");
  }

  if ("texto" in x && (typeof x.texto !== "string" || x.texto.trim() === "")) {
    problemas.push("texto (texto, não vazio)");
  }

  if ("estado" in x && !eEstado(x.estado)) {
    problemas.push('estado ("rascunho" ou "publicado")');
  }

  // Mesmo com Partial no tipo, um PATCH tem de conter pelo menos um campo reconhecido.
  if (!("titulo" in x) && !("texto" in x) && !("estado" in x)) {
    problemas.push("pelo menos um campo para alterar (titulo, texto ou estado)");
  }

  return problemas;
}

// Permite à rota usar os campos opcionais depois de confirmar que o body é válido.
export function eAlteracaoArtigo(x: unknown): x is AlteracaoArtigo {
  return problemasAlteracaoArtigo(x).length === 0;
}
