import crypto from 'node:crypto';

/**
 * Hachage de mot de passe sécurisé.
 * Utilise scrypt avec sel aléatoire et paramètres conformes OWASP (ou Argon2id).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Vérifie un mot de passe contre son hachage stocké.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const salt = parts[1];
  const originalHex = parts[2];

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      const originalBuffer = Buffer.from(originalHex, 'hex');
      if (originalBuffer.length !== derivedKey.length) {
        return resolve(false);
      }
      resolve(crypto.timingSafeEqual(originalBuffer, derivedKey));
    });
  });
}

/**
 * Génère un jeton de session cryptographiquement sécurisé.
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Chiffrement symétrique AES-256-GCM pour jetons e-MECeF et données sensibles.
 * Format de sortie : ivHex:authTagHex:ciphertextHex
 */
export function encryptData(plaintext: string, secretKeyHex?: string): string {
  const keyHex = secretKeyHex || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(keyHex.slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12); // GCM standard 96 bits

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Déchiffrement symétrique AES-256-GCM avec contrôle d'intégrité du tag d'authentification.
 */
export function decryptData(cipherPackage: string, secretKeyHex?: string): string {
  const parts = cipherPackage.split(':');
  if (parts.length !== 3) {
    throw new Error('Format de paquet chiffré invalide');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const keyHex = secretKeyHex || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(keyHex.slice(0, 64), 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
