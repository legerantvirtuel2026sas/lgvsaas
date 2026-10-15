import crypto from 'node:crypto';

/**
 * Utilitaires 2FA TOTP (RFC 6238) sans dépendance lourde externe
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(length = 20): string {
  const randomBytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < randomBytes.length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

function base32Decode(base32: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < base32.length; i++) {
    const char = base32.charAt(i).toUpperCase();
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Calcule le code TOTP à 6 chiffres pour un intervalle de temps donné (30s)
 */
export function generateTotpCode(secret: string, timeStepWindow = 0): string {
  const key = base32Decode(secret);
  const timeStep = Math.floor(Date.now() / 1000 / 30) + timeStepWindow;

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const token = (codeInt % 1_000_000).toString().padStart(6, '0');
  return token;
}

/**
 * Vérifie un code 2FA saisi par l'utilisateur avec une marge de tolérance de +/- 1 fenêtre (30s)
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  if (!token || token.length !== 6) return false;

  for (let window = -1; window <= 1; window++) {
    const expected = generateTotpCode(secret, window);
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}
