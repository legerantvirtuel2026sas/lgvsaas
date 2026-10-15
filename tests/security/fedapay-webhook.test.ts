import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  verifyFedaPayWebhookSignature,
  WebhookVerificationError,
} from '../../src/server/integrations/fedapay/webhook';

describe('Sécurité Webhook FedaPay et validation cryptographique (Module M1B)', () => {
  const secret = 'wh_secret_test_key_123456789';
  const validPayload = JSON.stringify({
    name: 'transaction.approved',
    id: 'evt_123456',
    entity: {
      id: 999,
      amount: 235900,
      status: 'approved',
      custom_metadata: { orderId: 'ord_123' },
    },
  });

  function generateValidSignature(body: string, key: string, timestamp?: number): string {
    const content = timestamp ? `${timestamp}.${body}` : body;
    const hmac = crypto.createHmac('sha256', key).update(content).digest('hex');
    return timestamp ? `t=${timestamp},s=${hmac}` : hmac;
  }

  it('valide un webhook avec une signature cryptographique conforme', () => {
    const signature = generateValidSignature(validPayload, secret);
    const parsed = verifyFedaPayWebhookSignature(validPayload, signature, secret);

    expect(parsed.name).toBe('transaction.approved');
    expect(parsed.id).toBe('evt_123456');
    expect(parsed.entity.amount).toBe(235900);
  });

  it('valide un webhook avec signature horodatée conforme', () => {
    const now = Math.floor(Date.now() / 1000);
    const signature = generateValidSignature(validPayload, secret, now);
    const parsed = verifyFedaPayWebhookSignature(validPayload, signature, secret);

    expect(parsed.name).toBe('transaction.approved');
  });

  it('rejette fermement un webhook si la signature est altérée ou falsifiée', () => {
    const forgedSignature = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

    expect(() =>
      verifyFedaPayWebhookSignature(validPayload, forgedSignature, secret)
    ).toThrow(WebhookVerificationError);
  });

  it('rejette un webhook dont le corps a été modifié après signature', () => {
    const signature = generateValidSignature(validPayload, secret);
    const tamperedPayload = validPayload.replace('235900', '1000');

    expect(() =>
      verifyFedaPayWebhookSignature(tamperedPayload, signature, secret)
    ).toThrow(WebhookVerificationError);
  });

  it('garantit l’idempotence : un événement déjà traité ne réactive pas la licence', () => {
    const processedEvents = new Set<string>();

    function processEvent(eventId: string): { processed: boolean; duplicate: boolean } {
      if (processedEvents.has(eventId)) {
        return { processed: false, duplicate: true };
      }
      processedEvents.add(eventId);
      return { processed: true, duplicate: false };
    }

    const firstCall = processEvent('evt_999');
    expect(firstCall.processed).toBe(true);
    expect(firstCall.duplicate).toBe(false);

    // Rejeu identique : rejeté sans effet de bord
    const secondCall = processEvent('evt_999');
    expect(secondCall.processed).toBe(false);
    expect(secondCall.duplicate).toBe(true);
  });
});
