'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  type?: 'text' | 'number' | 'date';
}

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  onSearchChange?: (term: string) => void;
  onSortChange?: (columnId: string, direction: SortDirection) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  totalCount = data.length,
  page = 1,
  pageSize = 10,
  onPageChange,
  onSearchChange,
  onSortChange,
  isLoading = false,
  emptyMessage = 'Aucune donnée disponible',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  // Gestion du tri (côté client si pas de handler serveur)
  const handleSort = (column: ColumnDef<T>) => {
    if (!column.sortable) return;

    let nextDirection: SortDirection = 'asc';
    if (sortColumn === column.id) {
      if (sortDirection === 'asc') nextDirection = 'desc';
      else if (sortDirection === 'desc') nextDirection = null;
    }

    setSortColumn(nextDirection ? column.id : null);
    setSortDirection(nextDirection);

    if (onSortChange) {
      onSortChange(column.id, nextDirection);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  // Filtrage local en fallback
  const filteredData = React.useMemo(() => {
    if (onSearchChange || !searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(lower)
      )
    );
  }, [data, searchTerm, onSearchChange]);

  // Tri local en fallback
  const sortedData = React.useMemo(() => {
    if (onSortChange || !sortColumn || !sortDirection) return filteredData;
    const col = columns.find((c) => c.id === sortColumn);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = (col.accessorKey ? a[col.accessorKey] : a[col.id]) as string | number;
      const valB = (col.accessorKey ? b[col.accessorKey] : b[col.id]) as string | number;

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (col.type === 'number') {
        comparison = Number(valA) - Number(valB);
      } else {
        comparison = String(valA).localeCompare(String(valB), 'fr');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns, onSortChange]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="w-full space-y-4">
      {/* Barre de recherche et actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Rechercher par saisie..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          {totalCount} élément{totalCount > 1 ? 's' : ''} au total
        </div>
      </div>

      {/* Tableau responsive */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700 border-b border-gray-200">
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={`px-4 py-3 select-none ${
                      col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-gray-400 text-xs">
                          {isSorted && sortDirection === 'asc' && '▲ (A-Z)'}
                          {isSorted && sortDirection === 'desc' && '▼ (Z-A)'}
                          {!isSorted && '⇅'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="h-28 text-center text-gray-500">
                  <div className="inline-block animate-spin mr-2">⏳</div>
                  Chargement des données...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-28 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-blue-50/40 transition-colors">
                  {columns.map((col) => {
                    const cellContent = col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? String(row[col.accessorKey] ?? '')
                      : '';
                    return (
                      <td key={col.id} className="px-4 py-3 whitespace-nowrap">
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
        <div>
          Page {page} sur {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange?.(page - 1)}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange?.(page + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
