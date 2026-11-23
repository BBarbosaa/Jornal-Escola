export interface DadosFonte { url: string }

export function eFonteValida(valor: unknown): valor is DadosFonte {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor) ||
      !("url" in valor) || typeof valor.url !== "string") return false;
  // Só o URL é editável; id, artigoId e dados de arquivo são definidos pelo servidor.
  if (Object.keys(valor).some((campo) => campo !== "url")) return false;
  if (!valor.url.trim()) return false;
  try {
    const url = new URL(valor.url.trim());
    return (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
