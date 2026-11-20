import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;

function obterChave(): Buffer {
  const chaveHex = process.env.CHAVE_ENCRIPTACAO;
  if (!chaveHex) {
    throw new Error("CHAVE_ENCRIPTACAO não está definida no .env");
  }

  const chave = Buffer.from(chaveHex, "hex");
  if (chave.length !== 32) {
    throw new Error("CHAVE_ENCRIPTACAO deve ter 64 caracteres hexadecimais (32 bytes)");
  }

  return chave;
}

export function encriptar(texto: string): string {
  const chave = obterChave();
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, chave, iv);

  const encriptado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encriptado.toString("hex")}`;
}

export function desencriptar(valor: string): string {
  const chave = obterChave();
  const partes = valor.split(":");
  if (partes.length !== 3) {
    throw new Error("Formato de dado encriptado inválido");
  }

  const [ivHex, authTagHex, dadosHex] = partes;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const dados = Buffer.from(dadosHex, "hex");

  const decipher = createDecipheriv(ALGORITMO, chave, iv);
  decipher.setAuthTag(authTag);

  const desencriptado = Buffer.concat([decipher.update(dados), decipher.final()]);
  return desencriptado.toString("utf8");
}