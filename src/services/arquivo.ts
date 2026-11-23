export interface DadosArquivo {
  arquivada: boolean;
  linkArquivo: string | null;
  dataArquivo: string | null;
}

export type ResultadoArquivo =
  | { ok: true; dados: DadosArquivo }
  | { ok: false; erro: string };

function eObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// O tstamp do Arquivo.pt tem o formato AAAAMMDDhhmmss (UTC)
function converterData(valor: unknown): string | null {
  if (typeof valor !== "string" || !/^\d{14}$/.test(valor)) return null;
  const iso = `${valor.slice(0, 4)}-${valor.slice(4, 6)}-${valor.slice(6, 8)}T${valor.slice(8, 10)}:${valor.slice(10, 12)}:${valor.slice(12, 14)}.000Z`;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) || data.toISOString() !== iso ? null : iso;
}

export async function consultarArquivo(urlOriginal: string): Promise<ResultadoArquivo> {
  const timeout = Number(process.env.ARQUIVO_TIMEOUT_MS ?? 5000);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 60000) {
    throw new Error("ARQUIVO_TIMEOUT_MS deve ser um inteiro entre 1 e 60000.");
  }

  const endpoint = new URL(process.env.ARQUIVO_URL ?? "https://arquivo.pt/textsearch");
  endpoint.searchParams.set("versionHistory", urlOriginal);
  endpoint.searchParams.set("maxItems", "1");
  endpoint.searchParams.set("fields", "tstamp,linkToArchive");

  try {
    const resposta = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeout),
    });
    if (!resposta.ok) return { ok: false, erro: "O Arquivo.pt respondeu com erro." };

    const dados: unknown = await resposta.json();
    if (!eObjeto(dados) || !Array.isArray(dados.response_items)) {
      return { ok: false, erro: "O Arquivo.pt devolveu uma resposta inválida." };
    }
    if (dados.response_items.length === 0) {
      return { ok: true, dados: { arquivada: false, linkArquivo: null, dataArquivo: null } };
    }

    const versao: unknown = dados.response_items[0];
    if (!eObjeto(versao) || typeof versao.linkToArchive !== "string") {
      return { ok: false, erro: "O Arquivo.pt devolveu uma versão inválida." };
    }
    const dataArquivo = converterData(versao.tstamp);
    const link = new URL(versao.linkToArchive);
    if (!dataArquivo || link.protocol !== "https:" || link.hostname !== "arquivo.pt" || link.username || link.password) {
      return { ok: false, erro: "O Arquivo.pt devolveu metadados inválidos." };
    }
    return { ok: true, dados: { arquivada: true, linkArquivo: link.href, dataArquivo } };
  } catch {
    return { ok: false, erro: "Não foi possível consultar o Arquivo.pt dentro do tempo disponível." };
  }
}
