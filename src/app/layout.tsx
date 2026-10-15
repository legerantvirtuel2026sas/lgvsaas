import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LGV SaaS - Le Gérant Virtuel',
  description: 'Application web de gestion commerciale, RH et paie pour PME d’Afrique de l’Ouest (Bénin)',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full flex flex-col antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
