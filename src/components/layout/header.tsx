'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logoutAction } from '@/server/actions/auth.actions';

export interface HeaderProps {
  companyName: string;
  companySlug: string;
  userRole?: string;
  licenseStatus?: string;
  daysRemaining?: number;
}

export function Header({
  companyName,
  companySlug,
  userRole = 'OWNER',
  licenseStatus = 'TRIAL',
  daysRemaining = 7,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push('/connexion');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-4">
        <Link href={`/e/${companySlug}`} className="flex items-center space-x-2">
          <span className="text-lg font-bold text-blue-600">LGV</span>
          <span className="font-semibold text-gray-800 text-sm hidden sm:inline">
            {companyName}
          </span>
        </Link>

        {licenseStatus === 'TRIAL' && (
          <Badge variant="warning">
            Essai : {daysRemaining}j restant{daysRemaining > 1 ? 's' : ''}
          </Badge>
        )}
        {licenseStatus === 'ACTIVE' && <Badge variant="success">Licence active</Badge>}
        {licenseStatus === 'EXPIRED' && <Badge variant="destructive">Expirée</Badge>}
      </div>

      <div className="flex items-center space-x-3">
        <Link href="/app/entreprises">
          <Button variant="ghost" size="sm" className="text-xs">
            Mes entreprises
          </Button>
        </Link>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
          {userRole}
        </span>
        <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
          Déconnexion
        </Button>
      </div>
    </header>
  );
}
