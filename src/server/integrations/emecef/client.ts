import crypto from 'node:crypto';
import {
  EmecefInvoiceRequest,
  EmecefInvoiceResponse,
  EmecefFinalizationResponse,
} from './types';

export class EmecefClient {
  /**
   * Envoie une demande d'émission de facture à l'e-MCF (Phase 1 du flux)
   */
  async submitInvoice(
    apiUrl: string,
    decryptedToken: string,
    req: EmecefInvoiceRequest,
    isTestMode: boolean = true
  ): Promise<EmecefInvoiceResponse> {
    if (isTestMode || !decryptedToken) {
      // Simulation conforme à l'API de test de la DGI
      const totalHt = req.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalVat = req.items
        .filter((item) => item.taxGroup === 'B')
        .reduce((sum, item) => sum + Math.round(item.price * item.quantity * 0.18), 0);
      const total = totalHt + totalVat;

      return {
        uid: `mecef_uid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        status: 'PENDING',
        ta: 0,
        tb: totalHt,
        tc: 0,
        td: 0,
        vaa: 0,
        vab: totalVat,
        vac: 0,
        vad: 0,
        total,
      };
    }

    const res = await fetch(`${apiUrl}/api/invoice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erreur e-MCF DGI (${res.status}): ${err}`);
    }

    return (await res.json()) as EmecefInvoiceResponse;
  }

  /**
   * Finalise la facture auprès de l'e-MCF et récupère les éléments de sécurité (Phase 2 du flux)
   */
  async confirmInvoice(
    apiUrl: string,
    decryptedToken: string,
    uid: string,
    isTestMode: boolean = true
  ): Promise<EmecefFinalizationResponse> {
    if (isTestMode || !decryptedToken) {
      // Génération d'un code MECeF/DGI de 24 caractères alphanumériques conforme
      const rawHex = crypto.randomBytes(12).toString('hex').toUpperCase();
      const codeMECeFDGI = rawHex.slice(0, 24);
      const nim = 'MCF0001-BENIN-TEST';
      const nowIso = new Date().toISOString();
      const qrCode = `F;${nim};${codeMECeFDGI};${nowIso};TEST`;

      return {
        uid,
        status: 'SUCCESS',
        nim,
        codeMECeFDGI,
        qrCode,
        counters: `0001/2026 FV`,
        dateTime: nowIso,
      };
    }

    const res = await fetch(`${apiUrl}/api/invoice/${uid}/confirm`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erreur confirmation e-MCF DGI (${res.status}): ${err}`);
    }

    return (await res.json()) as EmecefFinalizationResponse;
  }
}

export const emecefClient = new EmecefClient();
