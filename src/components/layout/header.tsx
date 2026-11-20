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
    <header className="h-20 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <Link href={`/e/${companySlug}`} className="flex items-center space-x-2.5 hover:opacity-90 transition-opacity">
          <span className="text-xl font-black text-blue-600 tracking-tight">LGV</span>
          <span className="text-gray-300 font-light text-base">|</span>
          <span className="font-bold text-gray-900 text-sm sm:text-base hidden sm:inline tracking-tight">
            {companyName}
          </span>
        </Link>

        {licenseStatus === 'TRIAL' && (
          <Badge variant="warning" className="text-xs py-1 px-2.5">
            Essai : {daysRemaining}j restant{daysRemaining > 1 ? 's' : ''}
          </Badge>
        )}
        {licenseStatus === 'ACTIVE' && (
          <Badge variant="success" className="text-xs py-1 px-2.5">
            Licence active
          </Badge>
        )}
        {licenseStatus === 'EXPIRED' && (
          <Badge variant="destructive" className="text-xs py-1 px-2.5">
            Expirée
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        <Link href="/app/entreprises">
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium rounded-lg">
            Mes entreprises
          </Button>
        </Link>
        <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-semibold tracking-wide bg-gray-100 text-gray-700 border border-gray-200">
          {userRole}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="h-8 px-3 text-xs font-medium rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
        >
          Déconnexion
        </Button>
      </div>
    </header>
  );
}
