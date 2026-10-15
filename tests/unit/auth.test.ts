import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  encryptData,
  decryptData,
} from '../../src/server/auth/crypto';
import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotpToken,
} from '../../src/server/auth/totp';
import { checkRateLimit } from '../../src/server/auth/ratelimit';

describe('Cryptographie et Authentification', () => {
  it('hache et vérifie les mots de passe avec succès', async () => {
    const password = 'SuperSecretPassword2026!';
    const hash = await hashPassword(password);

    expect(hash).toContain('scrypt:');
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('génère des jetons de session cryptographiquement uniques', () => {
    const t1 = generateSecureToken(32);
    const t2 = generateSecureToken(32);
    expect(t1).toHaveLength(64);
    expect(t2).toHaveLength(64);
    expect(t1).not.toBe(t2);
  });

  it('chiffre et déchiffre les jetons e-MECeF en AES-256-GCM', () => {
    const secretApiKey = 'dgi-emecef-token-test-xyz-12345';
    const encrypted = encryptData(secretApiKey);

    expect(encrypted).not.toBe(secretApiKey);
    expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptData(encrypted);
    expect(decrypted).toBe(secretApiKey);
  });

  it('génère et valide les codes 2FA TOTP', () => {
    const secret = generateTotpSecret(20);
    expect(secret.length).toBeGreaterThanOrEqual(16);

    const code = generateTotpCode(secret);
    expect(code).toHaveLength(6);

    const isValid = verifyTotpToken(code, secret);
    expect(isValid).toBe(true);

    const isInvalid = verifyTotpToken('000000', secret);
    expect(isInvalid).toBe(false);
  });

  it('bloque les requêtes abusives dépassant le rate limit', async () => {
    const ip = '197.234.221.10'; // IP béninoise de test
    const opts = { limit: 3, windowMs: 5000 };

    const r1 = await checkRateLimit(ip, opts);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit(ip, opts);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await checkRateLimit(ip, opts);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4ème requête : doit échouer
    const r4 = await checkRateLimit(ip, opts);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});
