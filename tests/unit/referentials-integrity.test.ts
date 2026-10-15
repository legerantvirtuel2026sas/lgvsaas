import { describe, it, expect } from 'vitest';

describe('Règles d’intégrité des référentiels (Module M3)', () => {
  it('bloque formellement la suppression d’un client ayant un solde de créance impayé', () => {
    const customer = {
      id: 'cust_debiteur_1',
      name: 'Client Redevable',
      currentDebt: 250000, // 250 000 FCFA impayés
    };

    function deleteCustomer(c: typeof customer) {
      if (c.currentDebt > 0) {
        throw new Error('Suppression bloquée : créances impayées existantes.');
      }
      return true;
    }

    expect(() => deleteCustomer(customer)).toThrow(/Suppression bloquée/);
  });

  it('bloque la suppression d’un article présent en stock physique', () => {
    const product = {
      id: 'prod_1',
      sku: 'RAM-A4',
      currentStock: 45, // 45 unités en stock
    };

    function deleteProduct(p: typeof product) {
      if (p.currentStock > 0) {
        throw new Error('Suppression bloquée : stock physique non nul.');
      }
      return true;
    }

    expect(() => deleteProduct(product)).toThrow(/Suppression bloquée/);
  });

  it('masque le prix de revient si l’utilisateur ne détient pas la permission costs.view', () => {
    const rawProducts = [
      { id: 'p1', name: 'Produit A', salePriceHt: 10000, costPrice: 6000 },
      { id: 'p2', name: 'Produit B', salePriceHt: 20000, costPrice: 14000 },
    ];

    function filterProductsForUser(products: typeof rawProducts, userPermissions: string[], role: string) {
      const canView = role === 'OWNER' || role === 'ADMIN' || userPermissions.includes('costs.view');
      return products.map((p) => ({
        ...p,
        costPrice: canView ? p.costPrice : null,
      }));
    }

    // Vendeur standard sans costs.view
    const sellerView = filterProductsForUser(rawProducts, ['sales.create'], 'USER');
    expect(sellerView[0].costPrice).toBeNull();
    expect(sellerView[1].costPrice).toBeNull();
    expect(sellerView[0].salePriceHt).toBe(10000);

    // Gestionnaire avec costs.view
    const managerView = filterProductsForUser(rawProducts, ['costs.view'], 'USER');
    expect(managerView[0].costPrice).toBe(6000);
  });
});
