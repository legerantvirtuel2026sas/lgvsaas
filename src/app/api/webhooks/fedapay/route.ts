import { NextRequest, NextResponse } from 'next/server';
import { verifyFedaPayWebhookSignature } from '@/server/integrations/fedapay/webhook';
import { licenseService } from '@/server/services/license.service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-fedapay-signature') || '';
    const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET || 'wh_sandbox_secret';

    // 1. Vérification cryptographique de l'en-tête X-FEDAPAY-SIGNATURE
    const payload = verifyFedaPayWebhookSignature(rawBody, signature, webhookSecret);

    // 2. Traitement idempotent de l'événement et activation de la licence
    const result = await licenseService.handleFedaPayWebhook(payload);

    return NextResponse.json({
      received: true,
      processed: true,
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur webhook inconnue';
    return NextResponse.json(
      {
        received: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
