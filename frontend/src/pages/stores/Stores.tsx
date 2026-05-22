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

const Stores: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stock');

  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/api/stock').then(r => r.data.data),
    refetchInterval: 60000
  });

  const { data: _movements } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: () => api.get('/api/stock').then(r => r.data.data)
  });

  const redItems = stock?.filter((s: any) => s.zone === 'red') || [];
  const yellowItems = stock?.filter((s: any) => s.zone === 'yellow') || [];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading stock data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Stores</h1>
          <p className="text-text-secondary text-sm mt-1">Stock balance and material movements</p>
        </div>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          + Issue Material
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Total Items</p>
          <p className="text-3xl font-bold mt-1">{stock?.length || 0}</p>
          <p className="text-blue-200 text-xs mt-1">In system</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Healthy</p>
          <p className="text-3xl font-bold text-green-500 mt-1">
            {stock?.filter((s: any) => s.zone === 'green').length || 0}
          </p>
          <p className="text-text-secondary text-xs mt-1">Green zone</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Reorder</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{yellowItems.length}</p>
          <p className="text-text-secondary text-xs mt-1">Yellow zone</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Critical</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{redItems.length}</p>
          <p className="text-text-secondary text-xs mt-1">Red zone</p>
        </div>
      </div>

      {redItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-700 mb-2 text-sm">⚠ Critical Stock — Action Required</h3>
          <div className="space-y-1">
            {redItems.map((item: any) => (
              <div key={item.item_id} className="flex justify-between text-sm">
                <span className="text-red-600">{item.item_name}</span>
                <span className="font-bold text-red-700">{item.quantity_on_hand} {item.unit_of_measure}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['stock', 'movements'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Location</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">On Hand</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Safety Stock</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Reorder Point</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Zone</th>
              </tr>
            </thead>
            <tbody>
              {stock?.map((item: any, i: number) => (
                <tr key={item.item_id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{item.item_name}</p>
                    <p className="text-text-secondary text-xs">{item.item_code}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{item.storage_location || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${
                      item.zone === 'red' ? 'text-red-500' :
                      item.zone === 'yellow' ? 'text-amber-500' : 'text-green-600'
                    }`}>
                      {item.quantity_on_hand?.toLocaleString()} {item.unit_of_measure}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">
                    {item.safety_stock?.toLocaleString() || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">
                    {item.reorder_point?.toLocaleString() || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ZoneBadge zone={item.zone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center text-text-secondary">
          Stock movement history will appear here
        </div>
      )}
    </div>
  );
};

export default Stores;
