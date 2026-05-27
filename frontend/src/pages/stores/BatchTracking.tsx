import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';

const BatchTraceModal: React.FC<{ batchNumber: string; onClose: () => void }> = ({ batchNumber, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['batchTrace', batchNumber],
    queryFn: () => api.get(`/api/batch/${encodeURIComponent(batchNumber)}`).then(r => r.data.data),
    staleTime: 0
  });

  const txColor: any = {
    receipt: 'bg-green-100 text-green-700 border-green-200',
    issue: 'bg-red-100 text-red-700 border-red-200',
    adjustment: 'bg-purple-100 text-purple-700 border-purple-200',
    grn_reversal: 'bg-amber-100 text-amber-700 border-amber-200',
    quarantine: 'bg-orange-100 text-orange-700 border-orange-200'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-text-primary">Batch Trace — {batchNumber}</h2>
            <p className="text-text-secondary text-sm">Full traceability: Receipt → Storage → Issue</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-brand-primary animate-pulse">Loading trace...</div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-xs text-green-600 uppercase">Total Received</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{fmt(data?.summary?.total_received)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 uppercase">Total Issued</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{fmt(data?.summary?.total_issued)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 uppercase">Balance in Store</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{fmt(data?.summary?.current_balance)}</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-semibold text-text-primary text-sm mb-3">📍 Trace Timeline</h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                <div className="space-y-3">

                  {/* GRN Receipts */}
                  {data?.grn_receipts?.map((line: any, i: number) => (
                    <div key={i} className="flex gap-4 pl-10 relative">
                      <div className="absolute left-2.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow mt-1"></div>
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-green-700 text-sm">📦 GRN Receipt — {line.grn?.grn_number}</p>
                            <p className="text-xs text-green-600 mt-0.5">Supplier: {line.supplier_name} | PO: {line.grn?.po?.po_number || '—'}</p>
                          </div>
                          <p className="text-xs text-text-secondary">{new Date(line.grn?.received_date || line.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div><p className="text-text-secondary">Received</p><p className="font-bold text-green-700">{fmt(line.quantity_received)} {line.item?.unit_of_measure}</p></div>
                          <div><p className="text-text-secondary">Accepted</p><p className="font-bold text-green-700">{fmt(line.accepted_qty || line.quantity_received)}</p></div>
                          <div><p className="text-text-secondary">Rejected</p><p className={`font-bold ${line.rejected_qty > 0 ? 'text-red-500' : 'text-text-secondary'}`}>{fmt(line.rejected_qty || 0)}</p></div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Stock Movements */}
                  {data?.stock_movements?.filter((m: any) => m.transaction_type !== 'receipt').map((m: any, i: number) => (
                    <div key={i} className="flex gap-4 pl-10 relative">
                      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white shadow mt-1 ${m.transaction_type === 'issue' ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                      <div className={`flex-1 rounded-lg p-3 border text-sm ${txColor[m.transaction_type] || 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium capitalize">{m.transaction_type === 'issue' ? '🔧 Issued to Job' : m.transaction_type === 'quarantine' ? '⚠ Moved to Quarantine' : '⚖ Stock Adjustment'} — {m.reference_number}</p>
                            <p className="text-xs mt-0.5">By: {m.transacted_by || '—'}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{fmt(m.quantity)} {m.item?.unit_of_measure}</p>
                            <p className="text-xs text-text-secondary">{new Date(m.transacted_at).toLocaleDateString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Job Issues */}
                  {data?.job_issues?.map((issue: any, i: number) => (
                    <div key={i} className="flex gap-4 pl-10 relative">
                      <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow mt-1"></div>
                      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-blue-700 text-sm">🏭 Used in Production — {issue.job?.job_number}</p>
                            <p className="text-xs text-blue-600 mt-0.5">Part: {issue.job?.part_name || '—'} | Qty: {issue.job?.quantity}</p>
                          </div>
                          <p className="text-xs text-text-secondary">{new Date(issue.issued_at).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BatchTracking: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['batches', search],
    queryFn: () => api.get(`/api/batch${search ? `?search=${search}` : ''}`).then(r => r.data.data),
    staleTime: 0
  });

  const batches = data || [];

  return (
    <div className="space-y-4">
      {selectedBatch && <BatchTraceModal batchNumber={selectedBatch} onClose={() => setSelectedBatch(null)} />}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">🔍 Batch & Lot Traceability</p>
        <p className="text-xs">Track any material batch from receipt through storage to production. Click any batch to see its full trace timeline.</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search batch number..."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-brand-primary animate-pulse">Loading batches...</div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-text-primary">No batches found</p>
          <p className="text-text-secondary text-sm mt-1">Batches are created when GRN lines have batch numbers entered</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Batch No</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">GRN</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Received Date</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Received</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Accepted</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Rejected</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Trace</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b: any, i: number) => (
                <tr key={i} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{b.batch_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{b.item_name}</p>
                    <p className="text-text-secondary text-xs">{b.item_code}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{b.supplier_name}</td>
                  <td className="px-4 py-3 text-xs font-medium text-brand-primary">{b.grn_number}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(b.received_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-xs">{fmt(b.total_received)} {b.unit_of_measure}</td>
                  <td className="px-4 py-3 text-right text-xs text-green-600 font-medium">{fmt(b.total_accepted)}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className={b.total_rejected > 0 ? 'text-red-500 font-medium' : 'text-text-secondary'}>{fmt(b.total_rejected)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setSelectedBatch(b.batch_number)}
                      className="text-xs bg-brand-light text-brand-primary px-3 py-1 rounded-lg hover:bg-blue-100 font-medium">
                      View Trace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BatchTracking;
