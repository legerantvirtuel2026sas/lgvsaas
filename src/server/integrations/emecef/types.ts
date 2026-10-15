/**
 * Typages officiels conformes à l'API e-MCF / SYGMEF de la DGI Bénin (Section 9 de PROJECT.md)
 */

export type EmecefInvoiceType = 'FV' | 'FA' | 'EV' | 'EA'; // FV: Facture de Vente, FA: Facture d'Avoir, EV: Export Vente, EA: Export Avoir

export type EmecefTaxGroup = 'A' | 'B' | 'C' | 'D';

export type EmecefPaymentType = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'TRANSFER' | 'CHECK' | 'OTHER';

export interface EmecefItemPayload {
  name: string;
  price: number; // Prix unitaire HT en FCFA entier
  quantity: number;
  taxGroup: EmecefTaxGroup;
  taxSpecific?: number;
  originalPrice?: number;
  priceModification?: string;
}

export interface EmecefInvoiceRequest {
  ifu: string;
  type: EmecefInvoiceType;
  items: EmecefItemPayload[];
  client?: {
    ifu?: string;
    name: string;
    contact?: string;
    address?: string;
  };
  operator: {
    id: string;
    name: string;
  };
  payment: {
    name: EmecefPaymentType;
    amount: number;
  }[];
  reference?: string; // Requis pour les avoirs (FA) : Code MECeF/DGI de 24 caractères
}

export interface EmecefInvoiceResponse {
  uid: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  ta: number; // Montant total A
  tb: number; // Montant total B
  tc: number; // Montant total C
  td: number; // Montant total D
  vaa: number; // TVA A
  vab: number; // TVA B (18%)
  vac: number; // TVA C
  vad: number; // TVA D
  total: number; // Total TTC calculé par l'e-MCF
  aib?: number;
  hab?: number;
  ts?: number;
}

export interface EmecefFinalizationResponse {
  uid: string;
  status: 'SUCCESS';
  nim: string; // Numéro d'Identification Machine DGI
  codeMECeFDGI: string; // Code sécurisé de 24 caractères alphanumériques
  qrCode: string; // Chaîne formatée QR code pour impression
  counters: string; // Compteurs consécutifs DGI
  dateTime: string;
}
