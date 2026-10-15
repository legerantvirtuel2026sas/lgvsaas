'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CORP_MENU_ITEMS, COMMERCE_MENU_ITEMS, MenuItemDefinition } from '@/server/modules/registry';

export interface SidebarProps {
  companySlug: string;
  role: 'OWNER' | 'ADMIN' | 'USER';
  userPermissions: string[];
}

export function Sidebar({ companySlug, role, userPermissions }: SidebarProps) {
  const pathname = usePathname();

  const isCommerceActive = pathname.includes('/commerce');

  const filterItems = (items: MenuItemDefinition[]) => {
    return items.filter((item) => {
      if (item.ownerOnly && role !== 'OWNER') return false;
      if (role === 'OWNER') return true;
      return userPermissions.includes(item.requiredPermission);
    });
  };

  const visibleCommerceItems = isCommerceActive ? filterItems(COMMERCE_MENU_ITEMS) : [];
  const visibleCorpItems = filterItems(CORP_MENU_ITEMS);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      {/* Retour au Hub */}
      <div className="p-4 border-b border-gray-100">
        <Link
          href={`/e/${companySlug}`}
          className="flex items-center space-x-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>← Hub des 4 activités</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-6">
        {/* Menus spécifiques à la carte commerciale */}
        {isCommerceActive && visibleCommerceItems.length > 0 && (
          <div>
            <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              Gestion commerciale
            </div>
            <div className="space-y-1">
              {visibleCommerceItems.map((item) => {
                const fullHref = `/e/${companySlug}/${item.path}`;
                const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

                return (
                  <Link
                    key={item.id}
                    href={fullHref}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Menus communs LGV Corp */}
        <div>
          <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            LGV Corp (Communs)
          </div>
          <div className="space-y-1">
            {visibleCorpItems.map((item) => {
              const fullHref = `/e/${companySlug}/${item.path}`;
              const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

              return (
                <Link
                  key={item.id}
                  href={fullHref}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
