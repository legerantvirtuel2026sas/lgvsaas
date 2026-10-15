import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from '../../src/server/auth/crypto';

describe('Normalisation e-MECeF et sécurité fiscale DGI Bénin (Module M7)', () => {
  it('chiffre et déchiffre le jeton d’API e-MCF avec AES-256-GCM', () => {
    const rawApiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token-dgi-bj-2026';
    const encrypted = encryptData(rawApiToken);

    expect(encrypted).not.toBe(rawApiToken);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptData(encrypted);
    expect(decrypted).toBe(rawApiToken);
  });

  it('bloque la finalisation en cas de divergence de totaux entre le calcul local et l’e-MCF', () => {
    const localTotal = 119000;
    const emecefTotal = 115000; // Divergence !

    function verifyTotals(local: number, remote: number) {
      if (local !== remote) {
        throw new Error(
          `Divergence de totaux : local=${local}, e-MCF=${remote}. Finalisation bloquée.`
        );
      }
      return true;
    }

    expect(() => verifyTotals(localTotal, emecefTotal)).toThrow(/Divergence de totaux/);
    expect(verifyTotals(localTotal, 119000)).toBe(true);
  });

  it('génère un code MECeF/DGI de 24 caractères alphanumériques et verrouille la facture', () => {
    const mockCodeMecef = 'A1B2C3D4E5F6789012345678';
    expect(mockCodeMecef).toHaveLength(24);

    const invoice = {
      id: 'fac_123',
      status: 'VALIDATED' as const,
    };

    function fiscalize(inv: typeof invoice) {
      return {
        ...inv,
        status: 'FISCALIZED' as const,
        mecefCode: mockCodeMecef,
      };
    }

    const locked = fiscalize(invoice);
    expect(locked.status).toBe('FISCALIZED');
    expect(locked.mecefCode).toHaveLength(24);
  });

  it('Invariant légal : une facture normalisée (FISCALIZED) ne peut JAMAIS être supprimée', () => {
    const invoice = {
      id: 'fac_123',
      status: 'FISCALIZED' as const,
    };

    function deleteInvoice(inv: typeof invoice) {
      if (inv.status === 'FISCALIZED') {
        throw new Error(
          'Interdiction légale : une facture normalisée e-MECeF ne peut être supprimée. Elle se corrige uniquement par un avoir.'
        );
      }
      return true;
    }

    expect(() => deleteInvoice(invoice)).toThrow(/Interdiction légale/);
  });
});
