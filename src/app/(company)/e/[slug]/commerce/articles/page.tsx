'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/data-table/data-table';
import { formatFcfa } from '@/server/domain/money';

interface ProductRow extends Record<string, unknown> {
  id: string;
  sku: string;
  name: string;
  category: string;
  salePriceHt: number;
  costPrice: number | null; // Masqué si pas de permission costs.view
  taxGroup: 'A' | 'B' | 'C' | 'D';
  currentStock: number;
  minStockAlert: number;
}

export default function ProductsPage({ params }: { params: { slug: string } }) {
  const companySlug = params.slug;

  const [products, setProducts] = React.useState<ProductRow[]>([
    {
      id: 'prod_1',
      sku: 'RAM-A4-80G',
      name: 'Rame de Papier A4 80g Double A',
      category: 'Bureautique',
      salePriceHt: 3500,
      costPrice: 2600,
      taxGroup: 'B', // 18%
      currentStock: 120,
      minStockAlert: 20,
    },
    {
      id: 'prod_2',
      sku: 'TONER-HP-85A',
      name: 'Cartouche Toner Laser HP 85A CE285A',
      category: 'Consommables',
      salePriceHt: 18500,
      costPrice: 12500,
      taxGroup: 'B',
      currentStock: 8,
      minStockAlert: 10, // Sous seuil d'alerte !
    },
    {
      id: 'prod_3',
      sku: 'CLAV-LOGI-K120',
      name: 'Clavier USB Filaire Logitech K120',
      category: 'Informatique',
      salePriceHt: 6500,
      costPrice: 4200,
      taxGroup: 'B',
      currentStock: 0, // Rupture de stock
      minStockAlert: 5,
    },
  ]);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [sku, setSku] = React.useState('');
  const [name, setName] = React.useState('');
  const [salePriceHt, setSalePriceHt] = React.useState('');
  const [costPrice, setCostPrice] = React.useState('');
  const [taxGroup, setTaxGroup] = React.useState<'A' | 'B' | 'C' | 'D'>('B');
  const [minStockAlert, setMinStockAlert] = React.useState('5');

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: ProductRow = {
      id: `prod_${Date.now()}`,
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      category: 'Général',
      salePriceHt: parseInt(salePriceHt, 10) || 0,
      costPrice: parseInt(costPrice, 10) || 0,
      taxGroup,
      currentStock: 0,
      minStockAlert: parseInt(minStockAlert, 10) || 5,
    };
    setProducts([newProd, ...products]);
    setShowAddModal(false);
    setSku('');
    setName('');
    setSalePriceHt('');
    setCostPrice('');
  };

  const handleDelete = (prod: ProductRow) => {
    if (prod.currentStock > 0) {
      alert(
        `Action bloquée : impossible de supprimer cet article car il est présent en stock physique (${prod.currentStock} unités). L'archivage est conseillé.`
      );
      return;
    }
    if (confirm(`Supprimer définitivement l'article ${prod.sku} - ${prod.name} ?`)) {
      setProducts(products.filter((p) => p.id !== prod.id));
    }
  };

  const columns: ColumnDef<ProductRow>[] = [
    {
      id: 'sku',
      header: 'Réf. SKU',
      accessorKey: 'sku',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-bold text-gray-900">{row.sku}</span>,
    },
    {
      id: 'name',
      header: 'Désignation',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-400">{row.category}</div>
        </div>
      ),
    },
    {
      id: 'salePriceHt',
      header: 'Prix Vente HT',
      accessorKey: 'salePriceHt',
      sortable: true,
      type: 'number',
      cell: (row) => <span className="font-semibold text-blue-600">{formatFcfa(row.salePriceHt)}</span>,
    },
    {
      id: 'costPrice',
      header: 'Prix Revient',
      accessorKey: 'costPrice',
      sortable: true,
      type: 'number',
      cell: (row) => (
        <span className="text-xs text-gray-500 font-mono">
          {row.costPrice !== null ? formatFcfa(row.costPrice) : '••••••'}
        </span>
      ),
    },
    {
      id: 'taxGroup',
      header: 'TVA e-MECeF',
      accessorKey: 'taxGroup',
      cell: (row) => (
        <Badge variant={row.taxGroup === 'B' ? 'default' : 'secondary'}>
          Gr. {row.taxGroup} {row.taxGroup === 'B' ? '(18%)' : '(Exo)'}
        </Badge>
      ),
    },
    {
      id: 'currentStock',
      header: 'Stock actuel',
      accessorKey: 'currentStock',
      sortable: true,
      type: 'number',
      cell: (row) => {
        const isOutOfStock = row.currentStock <= 0;
        const isUnderMin = row.currentStock <= row.minStockAlert;
        return (
          <div className="flex items-center space-x-2">
            <span
              className={`font-bold ${
                isOutOfStock ? 'text-red-600' : isUnderMin ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {row.currentStock}
            </span>
            {isOutOfStock ? (
              <Badge variant="destructive">Rupture</Badge>
            ) : isUnderMin ? (
              <Badge variant="warning">Alerte</Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} className="text-xs text-red-600">
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue des Articles & Stock</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestion du référentiel d’articles, prix de vente HT, prix de revient et alertes de stock.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddModal(true)}>+ Nouvel article</Button>
        </div>
      </div>

      <DataTable columns={columns} data={products} />

      {/* Modal d'ajout d'article */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Ajouter un nouvel article</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Référence / SKU *"
                  placeholder="EX: REF-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
                <Input
                  label="Seuil d'alerte stock"
                  type="number"
                  placeholder="5"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                />
              </div>

              <Input
                label="Désignation de l'article *"
                placeholder="Ex: Rame de papier A4 80g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix de vente unitaire HT (FCFA) *"
                  type="number"
                  placeholder="3500"
                  value={salePriceHt}
                  onChange={(e) => setSalePriceHt(e.target.value)}
                  required
                />
                <Input
                  label="Prix de revient unitaire HT (FCFA) *"
                  type="number"
                  placeholder="2500"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Groupe de taxation e-MECeF
                </label>
                <select
                  value={taxGroup}
                  onChange={(e) => setTaxGroup(e.target.value as 'A' | 'B' | 'C' | 'D')}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="B">Groupe B - Taxable 18% (Régime normal)</option>
                  <option value="A">Groupe A - Exonéré de TVA</option>
                  <option value="C">Groupe C - Exportation</option>
                  <option value="D">Groupe D - Régime d'exception</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer l'article</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
