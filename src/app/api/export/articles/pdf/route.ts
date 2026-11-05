import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ArticlesPdfDocument, PdfProductItem } from '@/components/export/articles-pdf-document';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const products: PdfProductItem[] = body.products || [];
    const companyName: string = body.companyName || 'LGV ENTREPRISE';
    const companySlug: string = body.companySlug || 'entreprise';

    const nowFormatted = new Date().toLocaleDateString('fr-BJ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const doc = React.createElement(ArticlesPdfDocument, {
      companyName,
      companySlug,
      exportedAt: nowFormatted,
      products,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any);

    const safeSlug = companySlug.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = new Date().toISOString().slice(0, 10);
    const filename = `catalogue_articles_${safeSlug}_${safeDate}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la génération du PDF du catalogue :', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du document PDF' },
      { status: 500 }
    );
  }
}
