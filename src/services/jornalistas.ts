import type { Jornalista } from "../tipos.ts";
import { lerDados, gravarDados } from "../utils/ficheiros.ts";
import { desencriptar } from "../utils/cripto.ts";

const FICHEIRO_JORNALISTAS = "jornalistas.json";

export const SALT_ROUNDS = 10;

export function lerJornalistas(): Promise<Jornalista[]> {
  return lerDados<Jornalista>(FICHEIRO_JORNALISTAS);
}

export function gravarJornalistas(jornalistas: Jornalista[]): Promise<void> {
  return gravarDados(FICHEIRO_JORNALISTAS, jornalistas);
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function procurarJornalistaPorId(
  jornalistas: Jornalista[],
  id: number | undefined,
): Jornalista | undefined {
  return jornalistas.find((j) => j.id === id);
}

export function procurarJornalistaPorEmail(
  jornalistas: Jornalista[],
  email: string,
): Jornalista | undefined {
  const emailNorm = normalizarEmail(email);
  return jornalistas.find((j) => j.email === emailNorm);
}

export function emailJaExiste(
  jornalistas: Jornalista[],
  email: string,
  ignorarId?: number,
): boolean {
  const emailNorm = normalizarEmail(email);
  return jornalistas.some((j) => j.email === emailNorm && j.id !== ignorarId);
}

export function formatarPerfil(jornalista: Jornalista) {
  return {
    id: jornalista.id,
    nome: jornalista.nome,
    email: jornalista.email,
    telefone: desencriptar(jornalista.telefone),
  };
}
