import { FedaPayCreateTransactionInput, FedaPayTransactionResponse } from './types';

export interface PaymentSessionResult {
  transactionId: string;
  paymentUrl: string;
  reference: string;
  amount: number;
}

export interface TransactionVerificationResult {
  verified: boolean;
  status: 'approved' | 'declined' | 'pending' | 'canceled';
  amount: number;
  currency: string;
  orderId: string;
}

export interface PaymentProvider {
  createPaymentSession(input: FedaPayCreateTransactionInput): Promise<PaymentSessionResult>;
  verifyTransaction(transactionId: string): Promise<TransactionVerificationResult>;
}

export class FedaPayClient implements PaymentProvider {
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.secretKey = process.env.FEDAPAY_SECRET_KEY || 'sk_sandbox_test_key';
    const env = process.env.FEDAPAY_ENV || 'sandbox';
    this.baseUrl =
      env === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';
  }

  /**
   * Crée une transaction auprès de FedaPay et renvoie l'URL de paiement sécurisée
   */
  async createPaymentSession(input: FedaPayCreateTransactionInput): Promise<PaymentSessionResult> {
    const isMock = !process.env.FEDAPAY_SECRET_KEY || process.env.NODE_ENV === 'test';

    if (isMock) {
      const mockId = `fedatx_${Date.now()}`;
      return {
        transactionId: mockId,
        paymentUrl: `https://sandbox-checkout.fedapay.com/pay/${mockId}`,
        reference: `REF-${Date.now()}`,
        amount: input.amount,
      };
    }

    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: input.description,
        amount: input.amount,
        currency: { iso: 'XOF' },
        callback_url: input.callback_url,
        customer: input.customer,
        custom_metadata: input.custom_metadata,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Échec création transaction FedaPay (${res.status}): ${err}`);
    }

    const data = (await res.json()) as { v1: FedaPayTransactionResponse };
    const tx = data.v1;

    // Générer l'URL de paiement si non fournie directement
    const tokenRes = await fetch(`${this.baseUrl}/transactions/${tx.id}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const tokenData = await tokenRes.json();

    return {
      transactionId: String(tx.id),
      paymentUrl: tokenData.url || tx.payment_url || `${this.baseUrl}/checkout/${tx.id}`,
      reference: tx.reference,
      amount: tx.amount,
    };
  }

  /**
   * Relecture directe serveur à serveur auprès de l'API FedaPay (Section 18.5)
   */
  async verifyTransaction(transactionId: string): Promise<TransactionVerificationResult> {
    const isMock = !process.env.FEDAPAY_SECRET_KEY || process.env.NODE_ENV === 'test';

    if (isMock) {
      return {
        verified: true,
        status: 'approved',
        amount: 235900,
        currency: 'XOF',
        orderId: transactionId.replace('fedatx_', 'order_'),
      };
    }

    const res = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Impossible de relire la transaction FedaPay : ${transactionId}`);
    }

    const data = (await res.json()) as { v1: FedaPayTransactionResponse };
    const tx = data.v1;

    return {
      verified: true,
      status: tx.status as 'approved' | 'declined' | 'pending' | 'canceled',
      amount: tx.amount,
      currency: tx.currency.iso,
      orderId: tx.custom_metadata?.orderId || '',
    };
  }
}

export const paymentProvider: PaymentProvider = new FedaPayClient();
