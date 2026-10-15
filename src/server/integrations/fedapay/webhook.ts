import crypto from 'node:crypto';
import { FedaPayWebhookPayload } from './types';

export class WebhookVerificationError extends Error {
  readonly status = 400;
  constructor(message = 'Signature de webhook invalide') {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

/**
 * Valide cryptographiquement la signature d'un webhook FedaPay (X-FEDAPAY-SIGNATURE)
 * @param payloadRaw Le corps brut de la requête (string)
 * @param signatureHeader La valeur de l'en-tête X-FEDAPAY-SIGNATURE
 * @param webhookSecret Le secret de webhook configuré dans les variables d'environnement
 * @param toleranceSeconds Tolérance maximale d'horodatage en secondes (défaut : 300s = 5 min)
 */
export function verifyFedaPayWebhookSignature(
  payloadRaw: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds: number = 300
): FedaPayWebhookPayload {
  if (!signatureHeader || !webhookSecret) {
    throw new WebhookVerificationError('En-tête de signature ou secret de webhook manquant');
  }

  // L'en-tête peut être au format "t=1600000000,s=hexsignature" ou directement la signature hex
  let timestamp: number | null = null;
  let signature: string | null = null;

  if (signatureHeader.includes('t=') && signatureHeader.includes('s=')) {
    const parts = signatureHeader.split(',');
    for (const part of parts) {
      const [k, v] = part.split('=');
      if (k === 't') timestamp = parseInt(v, 10);
      if (k === 's') signature = v;
    }
  } else {
    signature = signatureHeader.trim();
  }

  if (!signature) {
    throw new WebhookVerificationError('Signature introuvable dans l’en-tête');
  }

  // Vérification de l'anti-rejeu par horodatage si présent
  if (timestamp) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      throw new WebhookVerificationError('Horodatage du webhook expiré ou invalide');
    }
  }

  // Calcul du HMAC-SHA256 attendu
  const signedContent = timestamp ? `${timestamp}.${payloadRaw}` : payloadRaw;
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(signedContent);
  const expectedSignature = hmac.digest('hex');

  // Comparaison timing-safe
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');

  if (
    expectedBuf.length !== signatureBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, signatureBuf)
  ) {
    throw new WebhookVerificationError('Signature cryptographique non concordante');
  }

  try {
    return JSON.parse(payloadRaw) as FedaPayWebhookPayload;
  } catch {
    throw new WebhookVerificationError('Corps JSON du webhook illisible');
  }
}
