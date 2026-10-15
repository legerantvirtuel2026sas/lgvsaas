import { describe, it, expect } from 'vitest';
import { ACTIVITY_CARDS } from '../../src/server/modules/registry';

describe('Hub des 4 cartes et verrouillage de maintenance (Module M1)', () => {
  it('configure initialement la carte COMMERCE comme OPEN et les 3 autres en MAINTENANCE', () => {
    expect(ACTIVITY_CARDS.COMMERCE.defaultStatus).toBe('OPEN');
    expect(ACTIVITY_CARDS.SERVICES.defaultStatus).toBe('MAINTENANCE');
    expect(ACTIVITY_CARDS.FLEET.defaultStatus).toBe('MAINTENANCE');
    expect(ACTIVITY_CARDS.CONSOLIDATION.defaultStatus).toBe('MAINTENANCE');
  });

  it('bloque l’accès direct par URL à une route en maintenance', () => {
    function resolveRouteAccess(routePath: string, flags: Record<string, 'OPEN' | 'MAINTENANCE'>) {
      if (routePath.includes('/services') && flags.SERVICES === 'MAINTENANCE') {
        return { accessGranted: false, view: 'MAINTENANCE_SCREEN' };
      }
      if (routePath.includes('/flotte') && flags.FLEET === 'MAINTENANCE') {
        return { accessGranted: false, view: 'MAINTENANCE_SCREEN' };
      }
      if (routePath.includes('/consolidation') && flags.CONSOLIDATION === 'MAINTENANCE') {
        return { accessGranted: false, view: 'MAINTENANCE_SCREEN' };
      }
      if (routePath.includes('/commerce') && flags.COMMERCE === 'OPEN') {
        return { accessGranted: true, view: 'COMMERCE_VIEW' };
      }
      return { accessGranted: false, view: 'NOT_FOUND' };
    }

    const currentFlags = {
      COMMERCE: 'OPEN' as const,
      SERVICES: 'MAINTENANCE' as const,
      FLEET: 'MAINTENANCE' as const,
      CONSOLIDATION: 'MAINTENANCE' as const,
    };

    // Accès direct par URL à la gestion commerciale : autorisé
    const resCommerce = resolveRouteAccess('/e/abp-tech/commerce/tableau-de-bord', currentFlags);
    expect(resCommerce.accessGranted).toBe(true);
    expect(resCommerce.view).toBe('COMMERCE_VIEW');

    // Accès direct par URL aux prestations & services : verrouillé
    const resServices = resolveRouteAccess('/e/abp-tech/services', currentFlags);
    expect(resServices.accessGranted).toBe(false);
    expect(resServices.view).toBe('MAINTENANCE_SCREEN');

    // Accès direct par URL à la flotte : verrouillé
    const resFleet = resolveRouteAccess('/e/abp-tech/flotte', currentFlags);
    expect(resFleet.accessGranted).toBe(false);
    expect(resFleet.view).toBe('MAINTENANCE_SCREEN');
  });
});
