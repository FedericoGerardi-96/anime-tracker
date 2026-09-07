import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.MAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!encodedKey) throw new Error("Falta configurar MAL_TOKEN_ENCRYPTION_KEY");

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("MAL_TOKEN_ENCRYPTION_KEY debe contener 32 bytes codificados en Base64");
  }
  return key;
}

export function encryptMalToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptMalToken(payload: string): string {
  const [ivValue, authTagValue, ciphertextValue] = payload.split(".");
  if (!ivValue || !authTagValue || !ciphertextValue) throw new Error("Token cifrado inválido");

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
