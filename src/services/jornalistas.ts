// Funções partilhadas pelo registo, login e perfil para evitar repetir a mesma lógica.
import type { Jornalista } from "../tipos.ts";
import { lerDados, gravarDados } from "../utils/ficheiros.ts";
import { desencriptar } from "../utils/cripto.ts";

const FICHEIRO_JORNALISTAS = "jornalistas.json";

// Fator de custo do bcrypt: aumentar torna o cálculo mais caro. Não significa 10 hashes.
// O salt aleatório é gerado pela biblioteca e fica incluído no resultado do hash.
export const SALT_ROUNDS = 10;

// Promise<Jornalista[]> representa um resultado assíncrono que será um array de jornalistas.
export function lerJornalistas(): Promise<Jornalista[]> {
  return lerDados<Jornalista>(FICHEIRO_JORNALISTAS);
}

// Promise<void> permite aguardar a gravação, sem devolver dados de resultado.
export function gravarJornalistas(jornalistas: Jornalista[]): Promise<void> {
  return gravarDados(FICHEIRO_JORNALISTAS, jornalistas);
}

// Evita tratar " Ana@Escola.pt " e "ana@escola.pt" como contas diferentes.
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// find devolve o primeiro objeto encontrado ou undefined se não existir.
export function procurarJornalistaPorId(
  jornalistas: Jornalista[],
  id: number | undefined,
): Jornalista | undefined {
  return jornalistas.find((j) => j.id === id);
}

// Normaliza a pesquisa; os emails criados/atualizados pela API já são guardados normalizados.
export function procurarJornalistaPorEmail(
  jornalistas: Jornalista[],
  email: string,
): Jornalista | undefined {
  const emailNorm = normalizarEmail(email);
  return jornalistas.find((j) => j.email === emailNorm);
}

// some responde true se existir pelo menos uma correspondência.
// ignorarId é opcional e permite excluir a própria conta ao atualizar o email.
export function emailJaExiste(
  jornalistas: Jornalista[],
  email: string,
  ignorarId?: number,
): boolean {
  const emailNorm = normalizarEmail(email);
  return jornalistas.some((j) => j.email === emailNorm && j.id !== ignorarId);
}

// Constrói explicitamente a resposta para não expor o hash da password.
// O telefone é desencriptado para o titular; o ficheiro continua a guardá-lo encriptado.
export function formatarPerfil(jornalista: Jornalista) {
  return {
    id: jornalista.id,
    nome: jornalista.nome,
    email: jornalista.email,
    telefone: desencriptar(jornalista.telefone),
  };
}
