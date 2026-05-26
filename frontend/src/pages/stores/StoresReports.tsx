import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';
const fmtCurrency = (n: number) => '₹' + fmt(n);

const ZoneBadge: React.FC<{ zone: string }> = ({ zone }) => {
  const colors: any = { green: 'bg-green-50 text-green-600 border-green-200', yellow: 'bg-amber-50 text-amber-600 border-amber-200', red: 'bg-red-50 text-red-600 border-red-200' };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[zone] || 'bg-gray-50 text-gray-500'}`}>{zone?.toUpperCase()}</span>;
};

const ABCBadge: React.FC<{ cls: string }> = ({ cls }) => {
  const colors: any = { A: 'bg-red-50 text-red-600 border-red-200', B: 'bg-amber-50 text-amber-600 border-amber-200', C: 'bg-green-50 text-green-600 border-green-200' };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${colors[cls] || ''}`}>{cls}</span>;
};

const StockStatementReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['report_stock_statement'],
    queryFn: () => api.get('/api/stock/reports?type=stock_statement').then(r => r.data)
  });
  if (isLoading) return <div className="text-center py-12 text-brand-primary animate-pulse">Loading...</div>;
  const rows = data?.data || [];
  const summary = data?.summary || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white"><p className="text-blue-200 text-xs uppercase">Total Items</p><p className="text-3xl font-bold mt-1">{summary.total_items || 0}</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-brand-primary"><p className="text-text-secondary text-xs uppercase">Total Stock Value</p><p className="text-2xl font-bold text-brand-primary mt-1">{fmtCurrency(summary.grand_total || 0)}</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400"><p className="text-text-secondary text-xs uppercase">Below Reorder</p><p className="text-2xl font-bold text-red-500 mt-1">{rows.filter((r: any) => r.zone !== 'green').length}</p></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-brand-light">
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Location</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">On Hand</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Safety Stock</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Reorder Pt</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Unit Cost</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Total Value</th>
            <th className="text-center px-4 py-3 text-brand-primary font-medium">Zone</th>
          </tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className={`border-t border-border hover:bg-surface ${r.zone === 'red' ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                <td className="px-4 py-3"><p className="font-medium text-text-primary">{r.item_name}</p><p className="text-text-secondary text-xs">{r.item_code}</p></td>
                <td className="px-4 py-3 text-text-secondary text-xs capitalize">{r.item_type?.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-text-secondary text-xs">{r.storage_location}</td>
                <td className="px-4 py-3 text-right font-bold"><span className={r.zone === 'red' ? 'text-red-500' : r.zone === 'yellow' ? 'text-amber-500' : 'text-green-600'}>{fmt(r.quantity_on_hand)} {r.unit_of_measure}</span></td>
                <td className="px-4 py-3 text-right text-text-secondary text-xs">{fmt(r.safety_stock)}</td>
                <td className="px-4 py-3 text-right text-text-secondary text-xs">{fmt(r.reorder_point)}</td>
                <td className="px-4 py-3 text-right text-text-secondary text-xs">{fmtCurrency(r.unit_cost)}</td>
                <td className="px-4 py-3 text-right font-medium text-text-primary">{fmtCurrency(r.total_value)}</td>
                <td className="px-4 py-3 text-center"><ZoneBadge zone={r.zone} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-brand-light border-t-2 border-brand-primary">
            <td colSpan={7} className="px-4 py-3 text-right font-bold text-brand-primary">Grand Total</td>
            <td className="px-4 py-3 text-right font-bold text-brand-primary">{fmtCurrency(summary.grand_total || 0)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
};

const ReorderReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['report_reorder'],
    queryFn: () => api.get('/api/stock/reports?type=reorder').then(r => r.data)
  });
  if (isLoading) return <div className="text-center py-12 text-brand-primary animate-pulse">Loading...</div>;
  const rows = data?.data || [];
  const summary = data?.summary || {};
  if (rows.length === 0) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
      <p className="text-2xl mb-2">✅</p>
      <p className="font-semibold text-green-700">All items are above reorder point</p>
      <p className="text-green-600 text-sm mt-1">No procurement action required</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500 rounded-xl p-4 text-white"><p className="text-red-100 text-xs uppercase">Items to Reorder</p><p className="text-3xl font-bold mt-1">{summary.total_items || 0}</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400"><p className="text-text-secondary text-xs uppercase">Critical (Red)</p><p className="text-2xl font-bold text-red-500 mt-1">{summary.critical || 0}</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400"><p className="text-text-secondary text-xs uppercase">Warning (Yellow)</p><p className="text-2xl font-bold text-amber-500 mt-1">{(summary.total_items || 0) - (summary.critical || 0)}</p></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-brand-light">
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Supplier</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">On Hand</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Safety Stock</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Reorder Point</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Suggested Order Qty</th>
            <th className="text-center px-4 py-3 text-brand-primary font-medium">Zone</th>
          </tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className={`border-t border-border hover:bg-surface ${r.zone === 'red' ? 'bg-red-50' : 'bg-amber-50'}`}>
                <td className="px-4 py-3"><p className="font-medium text-text-primary">{r.item_name}</p><p className="text-text-secondary text-xs">{r.item_code}</p></td>
                <td className="px-4 py-3 text-text-secondary text-xs">{r.supplier}</td>
                <td className="px-4 py-3 text-right font-bold text-red-500">{fmt(r.quantity_on_hand)} {r.unit_of_measure}</td>
                <td className="px-4 py-3 text-right text-text-secondary text-xs">{fmt(r.safety_stock)}</td>
                <td className="px-4 py-3 text-right text-text-secondary text-xs">{fmt(r.reorder_point)}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-primary">{fmt(r.suggested_order_qty)} {r.unit_of_measure}</td>
                <td className="px-4 py-3 text-center"><ZoneBadge zone={r.zone} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ConsumptionReport: React.FC = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const query = `type=consumption${fromDate ? `&from_date=${fromDate}` : ''}${toDate ? `&to_date=${toDate}` : ''}`;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report_consumption', fromDate, toDate],
    queryFn: () => api.get(`/api/stock/reports?${query}`).then(r => r.data)
  });
  const rows = data?.data || [];
  const summary = data?.summary || {};
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm flex gap-4 items-end">
        <div><label className="block text-xs font-medium text-text-secondary mb-1">From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" /></div>
        <div><label className="block text-xs font-medium text-text-secondary mb-1">To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" /></div>
        {(fromDate || toDate) && <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-xs text-brand-primary hover:text-brand-dark pb-2">Clear</button>}
      </div>
      {isLoading ? <div className="text-center py-12 text-brand-primary animate-pulse">Loading...</div> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-brand-primary rounded-xl p-4 text-white"><p className="text-blue-200 text-xs uppercase">Items Consumed</p><p className="text-3xl font-bold mt-1">{summary.total_items || 0}</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-brand-primary"><p className="text-text-secondary text-xs uppercase">Total Issues</p><p className="text-2xl font-bold text-brand-primary mt-1">{summary.total_issues || 0}</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400"><p className="text-text-secondary text-xs uppercase">Total Value Consumed</p><p className="text-2xl font-bold text-green-600 mt-1">{fmtCurrency(summary.grand_total || 0)}</p></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Total Issued</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Unit Cost</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Total Value</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Issues</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Details</th>
              </tr></thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <React.Fragment key={i}>
                    <tr className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                      <td className="px-4 py-3"><p className="font-medium text-text-primary">{r.item_name}</p><p className="text-text-secondary text-xs">{r.item_code}</p></td>
                      <td className="px-4 py-3 text-right font-bold text-text-primary">{fmt(r.total_issued)} {r.unit_of_measure}</td>
                      <td className="px-4 py-3 text-right text-text-secondary text-xs">{fmtCurrency(r.unit_cost)}</td>
                      <td className="px-4 py-3 text-right font-medium text-brand-primary">{fmtCurrency(r.total_value)}</td>
                      <td className="px-4 py-3 text-right text-text-secondary text-xs">{r.issue_count}</td>
                      <td className="px-4 py-3 text-center"><button onClick={() => setExpandedItem(expandedItem === r.item_code ? null : r.item_code)} className="text-xs text-brand-primary hover:underline">{expandedItem === r.item_code ? 'Hide' : 'View Jobs'}</button></td>
                    </tr>
                    {expandedItem === r.item_code && (
                      <tr className="bg-blue-50 border-t border-border">
                        <td colSpan={6} className="px-6 py-3">
                          <table className="w-full text-xs">
                            <thead><tr className="text-brand-primary"><th className="text-left py-1">Job Card</th><th className="text-right py-1">Qty Issued</th><th className="text-left py-1">Date</th></tr></thead>
                            <tbody>{r.jobs.map((j: any, ji: number) => (
                              <tr key={ji} className="border-t border-blue-100">
                                <td className="py-1 font-medium">{j.job_number}</td>
                                <td className="py-1 text-right">{fmt(j.issued_qty)} {r.unit_of_measure}</td>
                                <td className="py-1 text-text-secondary">{new Date(j.issued_at).toLocaleDateString('en-IN')}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot><tr className="bg-brand-light border-t-2 border-brand-primary">
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-brand-primary">Grand Total</td>
                <td className="px-4 py-3 text-right font-bold text-brand-primary">{fmtCurrency(summary.grand_total || 0)}</td>
                <td colSpan={2}></td>
              </tr></tfoot>
            </table>
            {rows.length === 0 && <div className="text-center py-12 text-text-secondary">No consumption data for selected period</div>}
          </div>
        </>
      )}
    </div>
  );
};

const ABCAnalysisReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['report_abc'],
    queryFn: () => api.get('/api/stock/reports?type=abc').then(r => r.data)
  });
  if (isLoading) return <div className="text-center py-12 text-brand-primary animate-pulse">Loading...</div>;
  const rows = data?.data || [];
  const summary = data?.summary || {};
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">ABC Analysis — Pareto Classification</p>
        <p className="text-xs">Class A: Top 70% of consumption value — tightest control. Class B: Next 20% — moderate control. Class C: Bottom 10% — periodic review.</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white"><p className="text-blue-200 text-xs uppercase">Total Items</p><p className="text-3xl font-bold mt-1">{summary.total_items || 0}</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400"><p className="text-text-secondary text-xs uppercase">Class A</p><p className="text-2xl font-bold text-red-500 mt-1">{summary.a_count || 0} items</p><p className="text-text-secondary text-xs">70% of value</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400"><p className="text-text-secondary text-xs uppercase">Class B</p><p className="text-2xl font-bold text-amber-500 mt-1">{summary.b_count || 0} items</p><p className="text-text-secondary text-xs">20% of value</p></div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400"><p className="text-text-secondary text-xs uppercase">Class C</p><p className="text-2xl font-bold text-green-600 mt-1">{summary.c_count || 0} items</p><p className="text-text-secondary text-xs">10% of value</p></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-brand-light">
            <th className="text-center px-4 py-3 text-brand-primary font-medium">Rank</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Total Issued</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Consumption Value</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Cumulative %</th>
            <th className="text-center px-4 py-3 text-brand-primary font-medium">Class</th>
          </tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                <td className="px-4 py-3 text-center text-text-secondary text-xs font-medium">{i + 1}</td>
                <td className="px-4 py-3"><p className="font-medium text-text-primary">{r.item_name}</p><p className="text-text-secondary text-xs">{r.item_code}</p></td>
                <td className="px-4 py-3 text-right text-text-secondary text-xs">{fmt(r.total_issued)} {r.unit_of_measure}</td>
                <td className="px-4 py-3 text-right font-medium text-brand-primary">{fmtCurrency(r.consumption_value)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${r.abc_class === 'A' ? 'bg-red-400' : r.abc_class === 'B' ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${r.cumulative_pct}%` }}></div></div>
                    <span className="text-xs text-text-secondary">{r.cumulative_pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center"><ABCBadge cls={r.abc_class} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-center py-12 text-text-secondary">No consumption data available for ABC analysis</div>}
      </div>
    </div>
  );
};

const StoresReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState('stock_statement');
  const reports = [
    { key: 'stock_statement', label: '📦 Stock Statement' },
    { key: 'reorder', label: '🔔 Reorder Report' },
    { key: 'consumption', label: '📊 Consumption' },
    { key: 'abc', label: '🔢 ABC Analysis' }
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {reports.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === r.key ? 'bg-brand-primary text-white' : 'bg-white text-text-secondary hover:bg-surface border border-border'}`}>
            {r.label}
          </button>
        ))}
      </div>
      {activeReport === 'stock_statement' && <StockStatementReport />}
      {activeReport === 'reorder' && <ReorderReport />}
      {activeReport === 'consumption' && <ConsumptionReport />}
      {activeReport === 'abc' && <ABCAnalysisReport />}
    </div>
  );
};

export default StoresReports;
