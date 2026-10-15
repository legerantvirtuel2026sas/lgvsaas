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

const DEFAULT_WIDTH = 256; // 16rem = w-64
const MIN_WIDTH = 180;
const MAX_WIDTH = 480;

export function Sidebar({ companySlug, role, userPermissions }: SidebarProps) {
  const pathname = usePathname();
  const [width, setWidth] = React.useState<number>(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = React.useState<boolean>(false);
  const sidebarRef = React.useRef<HTMLElement>(null);

  // Charger la largeur personnalisée enregistrée en mémoire locale
  React.useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('lgv_sidebar_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          setWidth(parsed);
        }
      }
    } catch {
      // Ignorer si localStorage non disponible
    }
  }, []);

  const saveWidth = React.useCallback((newWidth: number) => {
    try {
      localStorage.setItem('lgv_sidebar_width', String(newWidth));
    } catch {
      // Ignorer
    }
  }, []);

  // Gestion du redimensionnement fluide par glisser-déposer
  const startResizing = React.useCallback(
    (mouseDownEvent: React.MouseEvent) => {
      mouseDownEvent.preventDefault();
      setIsResizing(true);

      const startX = mouseDownEvent.clientX;
      const startWidth = sidebarRef.current ? sidebarRef.current.getBoundingClientRect().width : width;

      const onMouseMove = (mouseMoveEvent: MouseEvent) => {
        const deltaX = mouseMoveEvent.clientX - startX;
        const rawWidth = startWidth + deltaX;
        const clampedWidth = Math.min(Math.max(rawWidth, MIN_WIDTH), MAX_WIDTH);
        setWidth(clampedWidth);
      };

      const onMouseUp = (mouseUpEvent: MouseEvent) => {
        setIsResizing(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const deltaX = mouseUpEvent.clientX - startX;
        const rawWidth = startWidth + deltaX;
        const finalWidth = Math.min(Math.max(rawWidth, MIN_WIDTH), MAX_WIDTH);
        setWidth(finalWidth);
        saveWidth(finalWidth);

        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [width, saveWidth]
  );

  // Double-clic sur la poignée pour réinitialiser la largeur par défaut
  const handleDoubleClick = React.useCallback(() => {
    setWidth(DEFAULT_WIDTH);
    saveWidth(DEFAULT_WIDTH);
  }, [saveWidth]);

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
    <aside
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className={`relative shrink-0 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none ${
        isResizing ? 'transition-none' : 'transition-[width] duration-75'
      }`}
    >
      {/* Contenu interne défilable */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Retour au Hub */}
        <div className="p-4 border-b border-gray-100 shrink-0">
          <Link
            href={`/e/${companySlug}`}
            className="flex items-center space-x-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span className="truncate">← Hub des 4 activités</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-6">
          {/* Menus spécifiques à la carte commerciale */}
          {isCommerceActive && visibleCommerceItems.length > 0 && (
            <div>
              <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400 truncate">
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
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menus communs LGV Corp */}
          <div>
            <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400 truncate">
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
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Bordure droite redimensionnable avec poignée et curseur col-resize */}
      <div
        onMouseDown={startResizing}
        onDoubleClick={handleDoubleClick}
        title="Glisser pour modifier la largeur • Double-clic pour réinitialiser"
        className={`group absolute top-0 -right-1 w-2.5 h-full cursor-col-resize z-40 flex items-center justify-center transition-colors select-none ${
          isResizing ? 'bg-blue-600/30' : 'hover:bg-blue-500/20'
        }`}
      >
        {/* Ligne indicatrice visuelle */}
        <div
          className={`w-[2px] h-full transition-colors ${
            isResizing ? 'bg-blue-600' : 'bg-transparent group-hover:bg-blue-400'
          }`}
        />

        {/* Petite poignée de préhension élégante au centre de la bordure */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-8 rounded-full border shadow-sm flex items-center justify-center bg-white transition-opacity ${
            isResizing
              ? 'opacity-100 border-blue-500 ring-2 ring-blue-200'
              : 'opacity-0 group-hover:opacity-100 border-gray-300'
          }`}
        >
          <div className="flex gap-0.5 items-center">
            <span className="w-0.5 h-3 bg-gray-400 rounded-full" />
            <span className="w-0.5 h-3 bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>
    </aside>
  );
}
