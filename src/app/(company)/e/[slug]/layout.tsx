import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ALL_PERMISSIONS } from '@/server/auth/permissions';

export default function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const companySlug = params.slug;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        companyName={companySlug.replace(/-/g, ' ').toUpperCase()}
        companySlug={companySlug}
        userRole="OWNER"
        licenseStatus="TRIAL"
        daysRemaining={7}
      />
      <div className="flex flex-1 min-w-0">
        <Sidebar
          companySlug={companySlug}
          role="OWNER"
          userPermissions={[...ALL_PERMISSIONS]}
        />
        <main className="flex-1 p-6 sm:p-8 min-w-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
