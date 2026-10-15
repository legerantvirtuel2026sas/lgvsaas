export type FedaPayEnvironment = 'sandbox' | 'live';

export type FedaPayTransactionStatus = 'pending' | 'approved' | 'declined' | 'canceled' | 'refunded';

export interface FedaPayCustomer {
  firstname: string;
  lastname: string;
  email: string;
  phone_number?: {
    number: string;
    country: string; // ex: 'bj'
  };
}

export interface FedaPayCreateTransactionInput {
  amount: number; // en XOF entier
  description: string;
  callback_url: string;
  customer: FedaPayCustomer;
  custom_metadata?: Record<string, string>;
}

export interface FedaPayTransactionResponse {
  id: number;
  reference: string;
  amount: number;
  status: FedaPayTransactionStatus;
  currency: {
    iso: string; // 'XOF'
  };
  custom_metadata?: Record<string, string>;
  payment_url?: string;
  created_at: string;
}

export interface FedaPayWebhookPayload {
  name: 'transaction.approved' | 'transaction.declined' | 'transaction.canceled';
  entity: {
    id: number;
    reference: string;
    amount: number;
    status: FedaPayTransactionStatus;
    custom_metadata?: Record<string, string>;
  };
  id: string; // Id d'événement unique
}
