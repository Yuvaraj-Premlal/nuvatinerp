import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const Quality: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rejections');

  const { data: rejections, isLoading: _rLoading } = useQuery({
    queryKey: ['rejections'],
    queryFn: () => api.get('/api/quality/rejections').then(r => r.data.data)
  });

  const summary = {
    total: rejections?.length || 0,
    scrap: rejections?.filter((r: any) => r.disposition === 'scrap').length || 0,
    rework: rejections?.filter((r: any) => r.disposition === 'rework').length || 0,
    totalQty: rejections?.reduce((s: number, r: any) => s + r.quantity_rejected, 0) || 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Quality</h1>
          <p className="text-text-secondary text-sm mt-1">Inspections and rejection tracking</p>
        </div>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          + Log Rejection
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-brand-primary">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Total Events</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Total Rejected</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{summary.totalQty} pcs</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Scrapped</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{summary.scrap}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Rework</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{summary.rework}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['rejections', 'inspections'].map((tab) => (
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

      {activeTab === 'rejections' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Defect</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Stage</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Qty</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {rejections?.map((r: any, i: number) => (
                <tr key={r.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(r.logged_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{r.defect_code || '—'}</p>
                    <p className="text-text-secondary text-xs">{r.defect_description || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{r.rejection_stage || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{r.quantity_rejected}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.disposition === 'scrap' ? 'bg-red-50 text-red-600' :
                      r.disposition === 'rework' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {r.disposition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rejections?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No rejections logged</div>
          )}
        </div>
      )}

      {activeTab === 'inspections' && (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center text-text-secondary">
          Inspection records will appear here
        </div>
      )}
    </div>
  );
};

export default Quality;
