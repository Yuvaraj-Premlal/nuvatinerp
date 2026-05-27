import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { printIssueSlip } from '../../utils/issue.slip.pdf';

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';

const IssueHistory: React.FC = () => {
  const [filterJob, setFilterJob] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const { data: jobs } = useQuery({ queryKey: ['jobcards'], queryFn: () => api.get('/api/jobcards').then(r => r.data.data) });

  const query = [
    filterJob ? `job_id=${filterJob}` : '',
    filterItem ? `item_id=${filterItem}` : '',
    filterFrom ? `from_date=${filterFrom}` : '',
    filterTo ? `to_date=${filterTo}` : ''
  ].filter(Boolean).join('&');

  const { data, isLoading } = useQuery({
    queryKey: ['issueHistory', filterJob, filterItem, filterFrom, filterTo],
    queryFn: () => api.get(`/api/stock/issue-history${query ? `?${query}` : ''}`).then(r => r.data.data),
    staleTime: 30000
  });

  const issues = data || [];
  const totalIssued = issues.reduce((s: number, g: any) => s + (g.total_issued_qty || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Job Card</label>
            <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
              <option value="">All Jobs</option>
              {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.job_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Item</label>
            <select value={filterItem} onChange={e => setFilterItem(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
              <option value="">All Items</option>
              {items?.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">From Date</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">To Date</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
        </div>
        {(filterJob || filterItem || filterFrom || filterTo) && (
          <button onClick={() => { setFilterJob(''); setFilterItem(''); setFilterFrom(''); setFilterTo(''); }}
            className="mt-2 text-xs text-brand-primary hover:text-brand-dark">Clear filters</button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase">Total Slips</p>
          <p className="text-3xl font-bold mt-1">{issues.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase">Total Issued</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalIssued)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase">FIFO Overrides</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{issues.filter((g: any) => g.is_fifo_override).length}</p>
        </div>
      </div>

      {/* Issue List */}
      {isLoading ? (
        <div className="text-center py-12 text-brand-primary animate-pulse">Loading issue history...</div>
      ) : issues.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-text-primary">No issue slips found</p>
          <p className="text-text-secondary text-sm mt-1">Issue slips will appear here once material is issued</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Slip No</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Job Card</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Qty</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Issued By</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Batches</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((g: any, i: number) => (
                <React.Fragment key={g.id}>
                  <tr className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3 font-medium text-brand-primary">{g.slip_number}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      <p>{new Date(g.issued_at).toLocaleDateString('en-IN')}</p>
                      <p>{new Date(g.issued_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{g.job?.job_number}</p>
                      <p className="text-text-secondary text-xs">{g.job?.part_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{g.item?.item_name}</p>
                      <p className="text-text-secondary text-xs">{g.item?.item_code}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-text-primary">
                      {fmt(g.total_issued_qty)} {g.item?.unit_of_measure}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{g.issued_by}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                        className="text-xs text-brand-primary hover:underline">
                        {g.lines?.length} batch{g.lines?.length > 1 ? 'es' : ''} {expandedId === g.id ? '▲' : '▼'}
                      </button>
                      {g.is_fifo_override && (
                        <span className="block text-xs text-amber-600 mt-0.5">⚠ Override</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => printIssueSlip({ ...g, job_card: g.job })}
                        className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100">
                        🖨 Print
                      </button>
                    </td>
                  </tr>
                  {expandedId === g.id && (
                    <tr className="bg-blue-50 border-t border-border">
                      <td colSpan={8} className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-brand-primary">
                              <th className="text-left py-1">Batch</th>
                              <th className="text-right py-1">Qty Issued</th>
                              <th className="text-left py-1">Override</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.lines?.map((line: any, li: number) => (
                              <tr key={li} className="border-t border-blue-100">
                                <td className="py-1 font-medium">{line.batch_number || '—'}</td>
                                <td className="py-1 text-right">{fmt(line.issued_qty)} {g.item?.unit_of_measure}</td>
                                <td className="py-1">
                                  {line.fifo_override
                                    ? <span className="text-amber-600">⚠ {line.override_reason}</span>
                                    : <span className="text-green-600">✓ FIFO</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IssueHistory;
