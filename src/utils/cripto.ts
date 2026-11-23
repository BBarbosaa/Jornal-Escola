// Encriptação reversível dos telefones. A mesma chave secreta permite encriptar/desencriptar.
// É diferente de bcrypt, que serve para verificar passwords sem recuperar o texto original.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256 usa uma chave de 256 bits (32 bytes); GCM também deteta alterações nos dados.
const ALGORITMO = "aes-256-gcm";
// O IV é um valor de inicialização aleatório de 12 bytes; não precisa de ser secreto.
const TAMANHO_IV = 12;

// Buffer representa bytes. A chave vem do ambiente e não fica escrita nos ficheiros de dados.
function obterChave(): Buffer {
  const chaveHex = process.env.CHAVE_ENCRIPTACAO;
  if (!chaveHex) {
    throw new Error("CHAVE_ENCRIPTACAO não está definida no .env");
  }

  // Cada par de caracteres hexadecimais representa um byte: 64 caracteres -> 32 bytes.
  const chave = Buffer.from(chaveHex, "hex");
  if (chave.length !== 32) {
    throw new Error("CHAVE_ENCRIPTACAO deve ter 64 caracteres hexadecimais (32 bytes)");
  }

  return chave;
}

// Converte o telefone legível numa string que pode ser guardada em JSON.
export function encriptar(texto: string): string {
  const chave = obterChave();
  // Um IV novo em cada operação faz o mesmo telefone produzir resultados diferentes.
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, chave, iv);

  // update processa o texto; final conclui a operação; concat junta os bytes produzidos.
  const encriptado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  // A etiqueta de autenticação permite detetar dados corrompidos/alterados na desencriptação.
  const authTag = cipher.getAuthTag();

  // Formato guardado: IV:etiqueta:dados. A chave secreta não é incluída.
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encriptado.toString("hex")}`;
}

// Recupera o telefone original. Precisa da mesma chave utilizada na encriptação.
export function desencriptar(valor: string): string {
  const chave = obterChave();
  // Separa os três elementos do formato definido por encriptar.
  const partes = valor.split(":");
  if (partes.length !== 3) {
    throw new Error("Formato de dado encriptado inválido");
  }

  // Desestrutura o array e converte os valores hexadecimais novamente para bytes.
  const [ivHex, authTagHex, dadosHex] = partes;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const dados = Buffer.from(dadosHex, "hex");

  const decipher = createDecipheriv(ALGORITMO, chave, iv, { authTagLength: 16 });
  // Fornece a etiqueta original para a verificação de integridade do GCM.
  decipher.setAuthTag(authTag);

  // final lança um erro se a autenticação falhar, por exemplo com chave/dados errados.
  const desencriptado = Buffer.concat([decipher.update(dados), decipher.final()]);
  // UTF-8 transforma os bytes recuperados em texto legível.
  return desencriptado.toString("utf8");
}
