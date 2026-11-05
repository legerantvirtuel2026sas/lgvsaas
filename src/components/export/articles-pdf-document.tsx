import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface PdfProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  salePriceHt: number;
  costPrice: number | null;
  taxGroup: string;
  currentStock: number;
  minStockAlert: number;
}

export interface ArticlesPdfDocumentProps {
  companyName: string;
  companySlug: string;
  exportedAt: string;
  products: PdfProductItem[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 28,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 12,
    marginBottom: 14,
  },
  companyBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  documentSubtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 2,
  },
  metaTextBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827',
  },
  // KPI summary cards
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  kpiLabel: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    color: '#6b7280',
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  // Table
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  cellSku: {
    width: '14%',
    fontSize: 8,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cellName: {
    width: '26%',
    paddingRight: 6,
  },
  cellNameMain: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cellNameSub: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 1,
  },
  cellCategory: {
    width: '13%',
    fontSize: 8,
    color: '#475569',
  },
  cellPrice: {
    width: '13%',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'right',
    paddingRight: 6,
  },
  cellCost: {
    width: '11%',
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right',
    paddingRight: 6,
  },
  cellStock: {
    width: '12%',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  stockNumber: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  stockUnit: {
    fontSize: 7,
    color: '#64748b',
  },
  cellStatus: {
    width: '11%',
    textAlign: 'center',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
    fontSize: 7.5,
    color: '#9ca3af',
  },
});

function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

export function ArticlesPdfDocument({
  companyName,
  exportedAt,
  products,
}: ArticlesPdfDocumentProps) {
  const totalStockUnits = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;
  const alertStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockAlert).length;
  const inStockCount = products.filter((p) => p.currentStock > p.minStockAlert).length;

  const totalSaleValue = products.reduce((acc, p) => acc + (p.salePriceHt || 0) * (p.currentStock || 0), 0);

  return (
    <Document
      title={`Catalogue des Articles - ${companyName}`}
      author="LGV SaaS"
      subject="Inventaire et Catalogue des Articles & Stocks"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* EN-TÊTE OFFICIEL */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyBadge}>Le Gérant Virtuel • Gestion Commerciale</Text>
            <Text style={styles.companyTitle}>
              {companyName || 'ENTREPRISE'} - CATALOGUE DES ARTICLES & STOCK
            </Text>
            <Text style={styles.documentSubtitle}>
              État des stocks en temps réel • Tarification HT et valorisation indicative
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.metaText}>
              Date d'édition : <Text style={styles.metaTextBold}>{exportedAt}</Text>
            </Text>
            <Text style={styles.metaText}>
              Articles référencés : <Text style={styles.metaTextBold}>{products.length}</Text>
            </Text>
            <Text style={styles.metaText}>
              Valeur stock HT : <Text style={styles.metaTextBold}>{formatPrice(totalSaleValue)}</Text>
            </Text>
          </View>
        </View>

        {/* INDICATEURS CLÉS (KPIS) */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Références</Text>
            <Text style={styles.kpiValue}>{products.length} articles</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Stock Global Restant</Text>
            <Text style={[styles.kpiValue, { color: '#2563eb' }]}>{totalStockUnits} unités</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Stock Disponible</Text>
            <Text style={[styles.kpiValue, { color: '#16a34a' }]}>{inStockCount} articles</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Alerte Stock Bas</Text>
            <Text style={[styles.kpiValue, { color: '#d97706' }]}>{alertStockCount} articles</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Rupture de Stock</Text>
            <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{outOfStockCount} articles</Text>
          </View>
        </View>

        {/* TABLEAU DES ARTICLES */}
        <View style={styles.table}>
          {/* Ligne d'en-tête */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellSku]}>Réf. SKU</Text>
            <Text style={[styles.tableHeaderCell, styles.cellName]}>Désignation de l'article</Text>
            <Text style={[styles.tableHeaderCell, styles.cellCategory]}>Catégorie</Text>
            <Text style={[styles.tableHeaderCell, styles.cellPrice]}>Prix Vente HT</Text>
            <Text style={[styles.tableHeaderCell, styles.cellCost]}>Prix Revient</Text>
            <Text style={[styles.tableHeaderCell, styles.cellStock]}>Stock Restant</Text>
            <Text style={[styles.tableHeaderCell, styles.cellStatus]}>Statut</Text>
          </View>

          {/* Lignes de données */}
          {products.map((p, index) => {
            const isOutOfStock = p.currentStock <= 0;
            const isUnderMin = p.currentStock > 0 && p.currentStock <= p.minStockAlert;
            const isEven = index % 2 === 1;

            return (
              <View
                key={p.id || p.sku || index}
                style={[styles.tableRow, isEven ? styles.tableRowEven : {}]}
              >
                <Text style={styles.cellSku}>{p.sku}</Text>
                <View style={styles.cellName}>
                  <Text style={styles.cellNameMain}>{p.name}</Text>
                  <Text style={styles.cellNameSub}>
                    Seuil min : {p.minStockAlert} unité{p.minStockAlert > 1 ? 's' : ''} • Taxe Gr. {p.taxGroup}
                  </Text>
                </View>
                <Text style={styles.cellCategory}>{p.category || 'Général'}</Text>
                <Text style={styles.cellPrice}>{formatPrice(p.salePriceHt)}</Text>
                <Text style={styles.cellCost}>{formatPrice(p.costPrice)}</Text>
                <View style={styles.cellStock}>
                  <Text
                    style={[
                      styles.stockNumber,
                      {
                        color: isOutOfStock
                          ? '#dc2626'
                          : isUnderMin
                          ? '#d97706'
                          : '#16a34a',
                      },
                    ]}
                  >
                    {p.currentStock}
                  </Text>
                  <Text style={styles.stockUnit}>
                    {p.currentStock > 1 ? 'unités' : 'unité'}
                  </Text>
                </View>
                <View style={styles.cellStatus}>
                  {isOutOfStock ? (
                    <Text style={[styles.badge, styles.badgeDanger]}>Rupture</Text>
                  ) : isUnderMin ? (
                    <Text style={[styles.badge, styles.badgeWarning]}>Alerte bas</Text>
                  ) : (
                    <Text style={[styles.badge, styles.badgeSuccess]}>Disponible</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* PIED DE PAGE AVEC NUMÉROTATION */}
        <View style={styles.footer} fixed>
          <Text>
            LGV SaaS • Document officiel de situation des stocks • Système certifié conforme UEMOA / e-MECeF Bénin
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} sur ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
