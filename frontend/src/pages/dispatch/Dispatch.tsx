import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const Dispatch: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders');

  const { data: salesOrders, isLoading } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => api.get('/api/dispatch/sales-orders').then(r => r.data.data)
  });

  const { data: dispatches } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => api.get('/api/dispatch').then(r => r.data.data)
  });

  const summary = {
    totalOrders: salesOrders?.length || 0,
    open: salesOrders?.filter((s: any) => s.status === 'open').length || 0,
    totalDispatches: dispatches?.length || 0,
    confirmed: dispatches?.filter((d: any) => d.status === 'confirmed').length || 0
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading dispatch data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Dispatch</h1>
          <p className="text-text-secondary text-sm mt-1">Sales orders and outbound shipments</p>
        </div>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          + New Dispatch
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Sales Orders</p>
          <p className="text-3xl font-bold mt-1">{summary.totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Open Orders</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{summary.open}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Dispatches</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{summary.totalDispatches}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Confirmed</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{summary.confirmed}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['orders', 'dispatches'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {tab === 'orders' ? 'Sales Orders' : 'Dispatches'}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">SO Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Order Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Delivery Date</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders?.map((so: any, i: number) => (
                <tr key={so.id} className={`border-t border-border hover:bg-surface cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{so.so_number}</td>
                  <td className="px-4 py-3 text-text-primary">{so.customer_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(so.order_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {so.delivery_date
                      ? new Date(so.delivery_date).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      so.status === 'open' ? 'bg-amber-50 text-amber-600' :
                      so.status === 'closed' ? 'bg-green-50 text-green-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {so.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {salesOrders?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No sales orders found</div>
          )}
        </div>
      )}

      {activeTab === 'dispatches' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Dispatch No</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Dispatch Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Vehicle</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Challan</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {dispatches?.map((d: any, i: number) => (
                <tr key={d.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{d.dispatch_number}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(d.dispatch_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{d.vehicle_number || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{d.challan_number || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.status === 'confirmed' ? 'bg-green-50 text-green-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dispatches?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No dispatches found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dispatch;
