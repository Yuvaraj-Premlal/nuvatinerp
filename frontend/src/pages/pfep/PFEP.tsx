import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const ZoneBadge: React.FC<{ zone: string }> = ({ zone }) => {
  const colors: any = {
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[zone] || 'bg-gray-50 text-gray-500'}`}>
      {zone?.toUpperCase()}
    </span>
  );
};

const PFEP: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: items, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.get('/api/items').then(r => r.data.data)
  });

  const { data: stockData } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/api/stock').then(r => r.data.data)
  });

  const filtered = items?.filter((item: any) => {
    const matchSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.item_code.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || item.item_type === filter;
    return matchSearch && matchFilter;
  });

  const getStock = (item_id: string) =>
    stockData?.find((s: any) => s.item_id === item_id);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading PFEP data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">PFEP Master</h1>
          <p className="text-text-secondary text-sm mt-1">Plan For Every Part — single source of truth</p>
        </div>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          + Add Item
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by part name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <option value="all">All Types</option>
          <option value="raw_material">Raw Material</option>
          <option value="finished_goods">Finished Goods</option>
          <option value="consumable">Consumable</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-light">
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Storage</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">On Hand</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Reorder Point</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Yield %</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Zone</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">ABC</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((item: any, i: number) => {
              const stock = getStock(item.id);
              return (
                <tr key={item.id} className={`border-t border-border hover:bg-surface cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{item.item_name}</p>
                    <p className="text-text-secondary text-xs">{item.item_code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-brand-light text-brand-primary px-2 py-0.5 rounded-full">
                      {item.item_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {item.pfep_detail?.storage_location || '—'}
                    {item.pfep_detail?.rack_address && ` · ${item.pfep_detail.rack_address}`}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text-primary">
                    {stock ? `${stock.quantity_on_hand?.toLocaleString()} ${item.unit_of_measure}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">
                    {item.pfep_detail?.reorder_point?.toLocaleString() || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">
                    {item.pfep_detail?.yield_percent ? `${item.pfep_detail.yield_percent}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stock?.zone ? <ZoneBadge zone={stock.zone} /> : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-text-primary">
                      {item.pfep_detail?.abc_classification || '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered?.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            No items found
          </div>
        )}
      </div>
    </div>
  );
};

export default PFEP;
