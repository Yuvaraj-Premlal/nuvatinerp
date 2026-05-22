import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    draft: 'bg-gray-50 text-gray-600',
    approved: 'bg-blue-50 text-blue-600',
    sent: 'bg-purple-50 text-purple-600',
    partial_received: 'bg-amber-50 text-amber-600',
    received: 'bg-green-50 text-green-600',
    cancelled: 'bg-red-50 text-red-600'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const Purchase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('po');

  const { data: pos, isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.get('/api/purchase').then(r => r.data.data)
  });

  const { data: grns } = useQuery({
    queryKey: ['grns'],
    queryFn: () => api.get('/api/grn').then(r => r.data.data)
  });

  const summary = {
    total: pos?.length || 0,
    draft: pos?.filter((p: any) => p.status === 'draft').length || 0,
    approved: pos?.filter((p: any) => p.status === 'approved').length || 0,
    received: pos?.filter((p: any) => p.status === 'received').length || 0,
    totalValue: pos?.reduce((s: number, p: any) => s + (p.total_value || 0), 0) || 0
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading purchase data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Purchase</h1>
          <p className="text-text-secondary text-sm mt-1">Purchase orders and goods receipt</p>
        </div>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          + New PO
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Total POs</p>
          <p className="text-3xl font-bold mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Pending Approval</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{summary.draft}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Approved</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{summary.approved}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Received</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{summary.received}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['po', 'grn'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {tab === 'po' ? 'Purchase Orders' : 'GRN'}
          </button>
        ))}
      </div>

      {activeTab === 'po' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Expected</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Raised By</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pos?.map((po: any, i: number) => (
                <tr key={po.id} className={`border-t border-border hover:bg-surface cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{po.po_number}</td>
                  <td className="px-4 py-3 text-text-primary">{po.supplier?.supplier_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(po.po_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {po.expected_delivery_date
                      ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      po.raised_by === 'agent'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-gray-50 text-gray-600'
                    }`}>
                      {po.raised_by}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={po.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pos?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No purchase orders found</div>
          )}
        </div>
      )}

      {activeTab === 'grn' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">GRN Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Reference</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Received Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Vehicle</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Received By</th>
              </tr>
            </thead>
            <tbody>
              {grns?.map((grn: any, i: number) => (
                <tr key={grn.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{grn.grn_number}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{grn.po_id || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(grn.received_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{grn.vehicle_number || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{grn.received_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {grns?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No GRNs found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Purchase;
