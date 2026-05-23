import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtPct = (n: number) => `${n || 0}%`;

const PLRow: React.FC<{ label: string; amount: number; percent?: number; bold?: boolean; color?: string; indent?: boolean; isTotal?: boolean }> = ({
  label, amount, percent, bold, color, indent, isTotal
}) => (
  <div className={`flex items-center justify-between py-2 ${isTotal ? 'border-t-2 border-border mt-1 pt-3' : 'border-b border-border'} ${indent ? 'pl-4' : ''}`}>
    <span className={`text-sm ${bold ? 'font-bold text-text-primary' : indent ? 'text-text-secondary' : 'text-text-primary'}`}>{label}</span>
    <div className="text-right">
      <span className={`text-sm font-${bold ? 'bold' : 'medium'} ${color || 'text-text-primary'}`}>{fmt(amount)}</span>
      {percent !== undefined && <span className="text-xs text-text-secondary ml-2">({fmtPct(percent)})</span>}
    </div>
  </div>
);

const DailyThroughputReport: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['dailyThroughput', date],
    queryFn: () => api.get(`/api/reports/finance/daily-throughput?date=${date}`).then(r => r.data.data)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        <button onClick={() => window.print()} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-dark">
          🖨 Print / PDF
        </button>
      </div>

      {isLoading && <div className="text-brand-primary animate-pulse">Loading...</div>}

      {data && (
        <div className="space-y-4 print:text-sm" id="report-content">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-xs text-text-secondary mb-1">{data.disclaimer}</p>
            <h2 className="font-bold text-text-primary">Daily Throughput — {new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-brand-primary">
              <p className="text-xs text-text-secondary uppercase">Good Parts</p>
              <p className="text-2xl font-bold text-text-primary">{data.production?.good_parts}</p>
              <p className="text-xs text-text-secondary">of {data.production?.planned_qty} planned ({data.production?.achievement_percent}%)</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
              <p className="text-xs text-text-secondary uppercase">Throughput</p>
              <p className="text-2xl font-bold text-green-600">{fmt(data.financials?.throughput)}</p>
              <p className="text-xs text-text-secondary">{fmtPct(data.financials?.throughput_percent)} of revenue</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
              <p className="text-xs text-text-secondary uppercase">EBITDA</p>
              <p className={`text-2xl font-bold ${data.financials?.ebitda >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{fmt(data.financials?.ebitda)}</p>
              <p className="text-xs text-text-secondary">{fmtPct(data.financials?.ebitda_percent)} of revenue</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
              <p className="text-xs text-text-secondary uppercase">Rejection Rate</p>
              <p className="text-2xl font-bold text-red-500">{data.production?.rejection_rate}%</p>
              <p className="text-xs text-text-secondary">Waste: {fmt(data.waste?.rejection_cost)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">Financial Summary</h3>
              <PLRow label="Net Revenue" amount={data.financials?.net_revenue} />
              <PLRow label="Material Cost" amount={data.financials?.variable_cost?.material} indent color="text-red-500" />
              <PLRow label="Energy Cost" amount={data.financials?.variable_cost?.energy} indent color="text-red-500" />
              <PLRow label="Labour Cost" amount={data.financials?.variable_cost?.labour} indent color="text-red-500" />
              <PLRow label="Scrap Recovery" amount={-data.financials?.variable_cost?.scrap_recovery} indent color="text-green-600" />
              <PLRow label="Total Variable Cost" amount={data.financials?.variable_cost?.total} bold color="text-red-500" />
              <PLRow label="Throughput" amount={data.financials?.throughput} bold percent={data.financials?.throughput_percent} color="text-green-600" />
              <PLRow label="Operating Expense" amount={data.financials?.operating_expense} color="text-red-500" />
              <PLRow label="EBITDA" amount={data.financials?.ebitda} bold percent={data.financials?.ebitda_percent} color={data.financials?.ebitda >= 0 ? 'text-blue-600' : 'text-red-500'} isTotal />
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">Production Summary</h3>
              <PLRow label="Planned Quantity" amount={data.production?.planned_qty} />
              <PLRow label="Good Parts Produced" amount={data.production?.good_parts} color="text-green-600" />
              <PLRow label="Total Shots" amount={data.production?.total_shots} />
              <PLRow label="Rejections" amount={data.production?.total_rejections} color="text-red-500" />
              <PLRow label="Downtime" amount={data.production?.downtime_minutes} />
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between py-1">
                  <span className="text-sm text-text-secondary">Achievement</span>
                  <span className={`font-bold ${data.production?.achievement_percent >= 100 ? 'text-green-600' : 'text-amber-500'}`}>
                    {data.production?.achievement_percent}%
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-text-secondary">Rejection Cost</span>
                  <span className="font-bold text-red-500">{fmt(data.waste?.rejection_cost)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MonthlyThroughputReport: React.FC = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['monthlyThroughput', month, year],
    queryFn: () => api.get(`/api/reports/finance/monthly-throughput?month=${month}&year=${year}`).then(r => r.data.data)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2024, i, 1).toLocaleString('en-IN', { month: 'long' })}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => window.print()} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-dark">
          🖨 Print / PDF
        </button>
      </div>

      {isLoading && <div className="text-brand-primary animate-pulse">Loading...</div>}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-brand-primary rounded-xl p-4 text-white">
              <p className="text-blue-200 text-xs uppercase">Net Revenue</p>
              <p className="text-2xl font-bold">{fmt(data.summary?.net_revenue)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
              <p className="text-xs text-text-secondary uppercase">Throughput</p>
              <p className="text-2xl font-bold text-green-600">{fmt(data.summary?.throughput)}</p>
              <p className="text-xs text-text-secondary">{fmtPct(data.summary?.throughput_percent)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
              <p className="text-xs text-text-secondary uppercase">Good Parts</p>
              <p className="text-2xl font-bold text-blue-600">{data.summary?.good_parts}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
              <p className="text-xs text-text-secondary uppercase">Variable Cost</p>
              <p className="text-2xl font-bold text-amber-600">{fmt(data.summary?.variable_cost)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">Day-by-Day Throughput</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {data.daily_data?.filter((d: any) => d.throughput > 0 || d.revenue > 0).map((d: any) => (
                  <div key={d.day} className="flex items-center gap-2 py-1 border-b border-border last:border-0">
                    <span className="text-xs text-text-secondary w-16">{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-400 h-1.5 rounded-full"
                        style={{ width: `${data.summary?.throughput > 0 ? Math.min((d.throughput / data.summary.throughput) * 100 * 10, 100) : 0}%` }}>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-green-600 w-24 text-right">{fmt(d.throughput)}</span>
                    <span className="text-xs text-text-secondary w-8 text-right">{d.throughput_percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">By Product</h3>
              {data.by_product?.length > 0 ? (
                <div className="space-y-2">
                  {data.by_product.map((p: any) => (
                    <div key={p.item_code} className="py-2 border-b border-border last:border-0">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-text-primary">{p.item_name}</span>
                        <span className="text-sm font-bold text-green-600">{fmt(p.throughput)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-text-secondary mt-0.5">
                        <span>{p.good_parts} pcs | Revenue: {fmt(p.revenue)}</span>
                        <span>{p.throughput_percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-text-secondary text-sm">No product data</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-green-600 mb-3">Top 3 Days</h3>
              {data.top_3_days?.map((d: any) => (
                <div key={d.day} className="flex justify-between py-1 border-b border-border last:border-0">
                  <span className="text-sm text-text-primary">{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span className="font-bold text-green-600">{fmt(d.throughput)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-red-500 mb-3">Bottom 3 Days</h3>
              {data.bottom_3_days?.map((d: any) => (
                <div key={d.day} className="flex justify-between py-1 border-b border-border last:border-0">
                  <span className="text-sm text-text-primary">{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span className="font-bold text-red-500">{fmt(d.throughput)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MonthlyOperatingStatement: React.FC = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['monthlyOperating', month, year],
    queryFn: () => api.get(`/api/reports/finance/monthly-operating?month=${month}&year=${year}`).then(r => r.data.data)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2024, i, 1).toLocaleString('en-IN', { month: 'long' })}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => window.print()} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-dark">
          🖨 Print / PDF
        </button>
      </div>

      {isLoading && <div className="text-brand-primary animate-pulse">Loading...</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-1">Monthly Operating Statement</h3>
            <p className="text-xs text-text-secondary mb-4">{data.disclaimer}</p>

            <PLRow label="Gross Revenue" amount={data.revenue?.gross_revenue} />
            {data.revenue?.credit_notes > 0 && <PLRow label="Less: Credit Notes" amount={-data.revenue?.credit_notes} indent color="text-red-500" />}
            <PLRow label="Net Revenue" amount={data.revenue?.net_revenue} bold />

            <div className="mt-3 mb-1 text-xs font-medium text-text-secondary uppercase tracking-wider">Variable Costs</div>
            <PLRow label="Raw Material" amount={data.variable_cost?.material} indent color="text-red-500" />
            <PLRow label="Energy" amount={data.variable_cost?.energy} indent color="text-red-500" />
            <PLRow label="Labour (Direct)" amount={data.variable_cost?.labour} indent color="text-red-500" />
            <PLRow label="Scrap Recovery" amount={-data.variable_cost?.scrap_recovery} indent color="text-green-600" />
            <PLRow label="Total Variable Cost" amount={data.variable_cost?.total} bold color="text-red-500" />

            <PLRow label="Throughput / Contribution" amount={data.throughput?.amount} bold percent={data.throughput?.percent} color="text-green-600" isTotal />

            <div className="mt-3 mb-1 text-xs font-medium text-text-secondary uppercase tracking-wider">Operating Expenses</div>
            {data.operating_expenses?.by_category && Object.entries(data.operating_expenses.by_category).map(([cat, amt]: any) => (
              <PLRow key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)} amount={amt} indent color="text-red-500" />
            ))}
            <PLRow label="Total Operating Expense" amount={data.operating_expenses?.total} bold color="text-red-500" />

            <PLRow label="EBITDA" amount={data.ebitda?.amount} bold percent={data.ebitda?.percent} color={data.ebitda?.amount >= 0 ? 'text-blue-600' : 'text-red-500'} isTotal />

            <div className="mt-2">
              {data.depreciation?.configured ? (
                <PLRow label="Less: Depreciation" amount={-data.depreciation?.amount} color="text-red-500" />
              ) : (
                <div className="flex justify-between py-2 text-sm text-text-secondary italic">
                  <span>Depreciation — not configured</span>
                  <span>Add fixed assets in Settings</span>
                </div>
              )}
              <PLRow label="EBIT" amount={data.ebit?.amount} bold percent={data.ebit?.percent} color={data.ebit?.amount >= 0 ? 'text-blue-600' : 'text-red-500'} />

              {data.interest?.configured ? (
                <PLRow label="Less: Interest" amount={-data.interest?.amount} color="text-red-500" />
              ) : (
                <div className="flex justify-between py-2 text-sm text-text-secondary italic">
                  <span>Interest — not configured</span>
                  <span>Add loans in Settings</span>
                </div>
              )}
              <PLRow label="EBT" amount={data.ebt?.amount} bold percent={data.ebt?.percent} color={data.ebt?.amount >= 0 ? 'text-blue-600' : 'text-red-500'} />

              {data.tax?.configured ? (
                <PLRow label={`Less: Tax (${data.tax?.rate}%)`} amount={-data.tax?.amount} color="text-red-500" />
              ) : (
                <div className="flex justify-between py-2 text-sm text-text-secondary italic">
                  <span>Tax rate — not configured</span>
                  <span>Add tax rate in Settings</span>
                </div>
              )}
              <PLRow label="Net Profit (PAT)" amount={data.net_profit?.amount} bold percent={data.net_profit?.percent} color={data.net_profit?.amount >= 0 ? 'text-green-600' : 'text-red-500'} isTotal />
            </div>
          </div>

          <div className="space-y-4">
            {data.depreciation?.configured && data.depreciation?.assets?.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-3">Depreciation Schedule</h3>
                {data.depreciation.assets.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between py-1 border-b border-border last:border-0 text-sm">
                    <span className="text-text-primary">{a.asset_name}</span>
                    <span className="text-red-500">{fmt(a.monthly_depreciation)}/mo</span>
                  </div>
                ))}
              </div>
            )}

            {data.interest?.configured && data.interest?.loans?.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-3">Interest Schedule</h3>
                {data.interest.loans.map((l: any, i: number) => (
                  <div key={i} className="flex justify-between py-1 border-b border-border last:border-0 text-sm">
                    <span className="text-text-primary">{l.loan_name}</span>
                    <span className="text-red-500">{fmt(l.monthly_interest)}/mo</span>
                  </div>
                ))}
              </div>
            )}

            {(!data.depreciation?.configured || !data.interest?.configured || !data.tax?.configured) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-700 mb-2 text-sm">Configuration Required</h3>
                <div className="space-y-1 text-xs text-amber-600">
                  {!data.depreciation?.configured && <p>• Fixed assets not configured — EBIT calculation incomplete</p>}
                  {!data.interest?.configured && <p>• Loan accounts not configured — EBT calculation incomplete</p>}
                  {!data.tax?.configured && <p>• Tax rate not configured — Net Profit calculation incomplete</p>}
                  <p className="mt-2 font-medium">Go to Settings → Finance Config to complete setup</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MonthlyFinanceStatement: React.FC = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['monthlyStatement', month, year],
    queryFn: () => api.get(`/api/reports/finance/monthly-statement?month=${month}&year=${year}`).then(r => r.data.data)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2024, i, 1).toLocaleString('en-IN', { month: 'long' })}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => window.print()} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-dark">
          🖨 Print / PDF
        </button>
      </div>

      {isLoading && <div className="text-brand-primary animate-pulse">Loading...</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">P&L Summary</h3>
              <PLRow label="Net Revenue" amount={data.pl_summary?.net_revenue} />
              <PLRow label="Throughput" amount={data.pl_summary?.throughput} color="text-green-600" />
              <PLRow label="EBITDA" amount={data.pl_summary?.ebitda} color={data.pl_summary?.ebitda >= 0 ? 'text-blue-600' : 'text-red-500'} />
              <PLRow label="EBIT" amount={data.pl_summary?.ebit} color={data.pl_summary?.ebit >= 0 ? 'text-blue-600' : 'text-red-500'} />
              <PLRow label="EBT" amount={data.pl_summary?.ebt} color={data.pl_summary?.ebt >= 0 ? 'text-blue-600' : 'text-red-500'} />
              <PLRow label="Net Profit (PAT)" amount={data.pl_summary?.net_profit} bold percent={data.pl_summary?.net_margin_percent} color={data.pl_summary?.net_profit >= 0 ? 'text-green-600' : 'text-red-500'} isTotal />
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">Cash Flow</h3>
              <PLRow label="Opening Balance" amount={data.cash_flow?.opening_balance} />
              <PLRow label="+ Customer Receipts" amount={data.cash_flow?.receipts_from_customers} color="text-green-600" />
              <PLRow label="- Supplier Payments" amount={-data.cash_flow?.payments_to_suppliers} color="text-red-500" />
              <PLRow label="- Operating Expenses" amount={-data.cash_flow?.operating_expenses_paid} color="text-red-500" />
              <PLRow label="Closing Balance" amount={data.cash_flow?.closing_balance} bold color={data.cash_flow?.closing_balance >= 0 ? 'text-green-600' : 'text-red-500'} isTotal />
              <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm">
                <span className="text-text-secondary">Net Cash Flow</span>
                <span className={`font-bold ${data.cash_flow?.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmt(data.cash_flow?.net_cash_flow)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">Balance Position</h3>
              <PLRow label="Bank Balance" amount={data.balance_position?.bank_balance} color="text-blue-600" />
              <PLRow label="Receivables Outstanding" amount={data.balance_position?.receivables_outstanding} color="text-green-600" />
              <PLRow label="Payables Outstanding" amount={data.balance_position?.payables_outstanding} color="text-red-500" />
              <PLRow label="Net Working Capital" amount={data.balance_position?.net_working_capital} bold color={data.balance_position?.net_working_capital >= 0 ? 'text-green-600' : 'text-red-500'} isTotal />
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">GST Position</h3>
              <PLRow label="Output GST (Sales)" amount={data.gst_position?.output_gst} color="text-red-500" />
              <PLRow label="Input GST Credit" amount={data.gst_position?.input_gst_credit} color="text-green-600" />
              <PLRow label="Net GST Payable" amount={data.gst_position?.net_gst_payable} bold color={data.gst_position?.net_gst_payable >= 0 ? 'text-amber-600' : 'text-green-600'} isTotal />
            </div>

            {data.aging_summary?.overdue_count > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="font-semibold text-red-700 mb-2 text-sm">Overdue Receivables</h3>
                <p className="text-red-600 text-sm">
                  {data.aging_summary?.overdue_count} invoice(s) overdue — Total: {fmt(data.aging_summary?.total_overdue)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FinanceConfigSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [assetForm, setAssetForm] = useState({
    asset_code: '', asset_name: '', category: 'machinery',
    purchase_value: '', purchase_date: '', useful_life_years: '10',
    salvage_value: '0', depreciation_method: 'straight_line', notes: ''
  });
  const [loanForm, setLoanForm] = useState({
    loan_name: '', lender_name: '', loan_type: 'term_loan',
    principal_amount: '', outstanding_amount: '', interest_rate: '',
    emi_amount: '', disbursement_date: '', maturity_date: ''
  });

  const { data: assets } = useQuery({ queryKey: ['fixedAssets'], queryFn: () => api.get('/api/reports/fixed-assets').then(r => r.data.data) });
  const { data: loans } = useQuery({ queryKey: ['loanAccounts'], queryFn: () => api.get('/api/reports/loans').then(r => r.data.data) });
  const { data: configs } = useQuery({ queryKey: ['costConfig'], queryFn: () => api.get('/api/costing/config').then(r => r.data.data) });

  const taxRate = configs?.find((c: any) => c.config_key === 'income_tax_rate')?.config_value || '';
  const [newTaxRate, setNewTaxRate] = useState('');

  const assetMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/reports/fixed-assets', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fixedAssets'] }); setShowAddAsset(false); }
  });

  const loanMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/reports/loans', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loanAccounts'] }); setShowAddLoan(false); }
  });

  const taxMutation = useMutation({
    mutationFn: (rate: number) => api.post('/api/costing/config', { config_key: 'income_tax_rate', config_value: rate, description: 'Income tax rate %' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['costConfig'] })
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Tax Configuration</h3>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Income Tax Rate %</label>
            <p className="text-xs text-text-secondary mb-2">Current: {taxRate ? `${taxRate}%` : 'Not configured'}</p>
          </div>
          <input type="number" value={newTaxRate} onChange={e => setNewTaxRate(e.target.value)}
            className="w-24 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="e.g. 25" />
          <button onClick={() => taxMutation.mutate(parseFloat(newTaxRate))}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-dark">
            Save
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary">Fixed Assets</h3>
            <p className="text-text-secondary text-xs">Used for depreciation calculation</p>
          </div>
          <button onClick={() => setShowAddAsset(!showAddAsset)} className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">
            + Add Asset
          </button>
        </div>

        {showAddAsset && (
          <div className="bg-surface rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={assetForm.asset_code} onChange={e => setAssetForm({ ...assetForm, asset_code: e.target.value })}
                placeholder="Asset code e.g. FA-001" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <input value={assetForm.asset_name} onChange={e => setAssetForm({ ...assetForm, asset_name: e.target.value })}
                placeholder="Asset name" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <select value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })}
                className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                <option value="machinery">Machinery</option>
                <option value="die">Die / Tooling</option>
                <option value="vehicle">Vehicle</option>
                <option value="computer">Computer</option>
                <option value="furniture">Furniture</option>
                <option value="other">Other</option>
              </select>
              <input type="number" value={assetForm.purchase_value} onChange={e => setAssetForm({ ...assetForm, purchase_value: e.target.value })}
                placeholder="Purchase value ₹" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <input type="number" value={assetForm.useful_life_years} onChange={e => setAssetForm({ ...assetForm, useful_life_years: e.target.value })}
                placeholder="Useful life (years)" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <input type="number" value={assetForm.salvage_value} onChange={e => setAssetForm({ ...assetForm, salvage_value: e.target.value })}
                placeholder="Salvage value ₹" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <select value={assetForm.depreciation_method} onChange={e => setAssetForm({ ...assetForm, depreciation_method: e.target.value })}
                className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                <option value="straight_line">Straight Line (SLM)</option>
                <option value="wdv">Written Down Value (WDV)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddAsset(false)} className="px-3 py-1.5 border border-border rounded text-xs text-text-secondary">Cancel</button>
              <button onClick={() => assetMutation.mutate({ ...assetForm, purchase_value: parseFloat(assetForm.purchase_value), useful_life_years: parseInt(assetForm.useful_life_years), salvage_value: parseFloat(assetForm.salvage_value) })}
                disabled={assetMutation.isPending}
                className="px-3 py-1.5 bg-brand-primary text-white rounded text-xs hover:bg-brand-dark disabled:opacity-50">
                {assetMutation.isPending ? 'Adding...' : 'Add Asset'}
              </button>
            </div>
          </div>
        )}

        {assets?.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-3 py-2 text-brand-primary">Asset</th>
                <th className="text-right px-3 py-2 text-brand-primary">Purchase Value</th>
                <th className="text-right px-3 py-2 text-brand-primary">Monthly Dep</th>
                <th className="text-right px-3 py-2 text-brand-primary">Book Value</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a: any) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{a.asset_name}</td>
                  <td className="px-3 py-2 text-right">{fmt(a.purchase_value)}</td>
                  <td className="px-3 py-2 text-right text-red-500">{fmt(a.monthly_depreciation)}</td>
                  <td className="px-3 py-2 text-right">{fmt(a.current_book_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-text-secondary text-sm">No fixed assets configured</p>}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary">Loan Accounts</h3>
            <p className="text-text-secondary text-xs">Used for interest calculation</p>
          </div>
          <button onClick={() => setShowAddLoan(!showAddLoan)} className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">
            + Add Loan
          </button>
        </div>

        {showAddLoan && (
          <div className="bg-surface rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={loanForm.loan_name} onChange={e => setLoanForm({ ...loanForm, loan_name: e.target.value })}
                placeholder="Loan name" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <input value={loanForm.lender_name} onChange={e => setLoanForm({ ...loanForm, lender_name: e.target.value })}
                placeholder="Lender name e.g. HDFC Bank" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <select value={loanForm.loan_type} onChange={e => setLoanForm({ ...loanForm, loan_type: e.target.value })}
                className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                <option value="term_loan">Term Loan</option>
                <option value="working_capital">Working Capital</option>
                <option value="overdraft">Overdraft</option>
              </select>
              <input type="number" value={loanForm.principal_amount} onChange={e => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                placeholder="Principal amount ₹" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <input type="number" value={loanForm.outstanding_amount} onChange={e => setLoanForm({ ...loanForm, outstanding_amount: e.target.value })}
                placeholder="Outstanding amount ₹" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              <input type="number" value={loanForm.interest_rate} onChange={e => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                placeholder="Interest rate % p.a." className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddLoan(false)} className="px-3 py-1.5 border border-border rounded text-xs text-text-secondary">Cancel</button>
              <button onClick={() => loanMutation.mutate({ ...loanForm, principal_amount: parseFloat(loanForm.principal_amount), outstanding_amount: parseFloat(loanForm.outstanding_amount), interest_rate: parseFloat(loanForm.interest_rate) })}
                disabled={loanMutation.isPending}
                className="px-3 py-1.5 bg-brand-primary text-white rounded text-xs hover:bg-brand-dark disabled:opacity-50">
                {loanMutation.isPending ? 'Adding...' : 'Add Loan'}
              </button>
            </div>
          </div>
        )}

        {loans?.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-3 py-2 text-brand-primary">Loan</th>
                <th className="text-left px-3 py-2 text-brand-primary">Lender</th>
                <th className="text-right px-3 py-2 text-brand-primary">Outstanding</th>
                <th className="text-right px-3 py-2 text-brand-primary">Rate</th>
                <th className="text-right px-3 py-2 text-brand-primary">Monthly Interest</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l: any) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{l.loan_name}</td>
                  <td className="px-3 py-2 text-text-secondary">{l.lender_name}</td>
                  <td className="px-3 py-2 text-right">{fmt(l.outstanding_amount)}</td>
                  <td className="px-3 py-2 text-right">{l.interest_rate}%</td>
                  <td className="px-3 py-2 text-right text-red-500">{fmt(Math.round(l.outstanding_amount * l.interest_rate / 100 / 12))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-text-secondary text-sm">No loans configured</p>}
      </div>
    </div>
  );
};

const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState('daily-throughput');

  const financeReports = [
    { id: 'daily-throughput', label: 'Daily Throughput' },
    { id: 'monthly-throughput', label: 'Monthly Throughput' },
    { id: 'monthly-operating', label: 'Monthly Operating Statement' },
    { id: 'monthly-statement', label: 'Monthly Finance Statement' },
    { id: 'finance-config', label: '⚙ Finance Config' }
  ];

  return (
    <div className="flex gap-6">
      <div className="w-56 flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-brand-primary px-4 py-3">
            <p className="text-white text-xs font-semibold uppercase tracking-wider">Finance Reports</p>
          </div>
          {financeReports.map(r => (
            <button key={r.id} onClick={() => setActiveReport(r.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-border transition-colors ${activeReport === r.id ? 'bg-brand-light text-brand-primary font-medium border-l-4 border-l-brand-primary' : 'text-text-secondary hover:bg-surface'}`}>
              {r.label}
            </button>
          ))}
          <div className="bg-gray-50 px-4 py-3 mt-2">
            <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Coming Soon</p>
          </div>
          {['Shift Report', 'Monthly Production', 'Customer OTIF', 'Rejection Trend', 'Die Health', 'Supplier Performance'].map(r => (
            <button key={r} className="w-full text-left px-4 py-3 text-sm border-b border-border text-gray-300 cursor-not-allowed">
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-text-primary">Reports</h1>
          <p className="text-text-secondary text-sm">Finance reports — RBAC restricted</p>
        </div>

        {activeReport === 'daily-throughput' && <DailyThroughputReport />}
        {activeReport === 'monthly-throughput' && <MonthlyThroughputReport />}
        {activeReport === 'monthly-operating' && <MonthlyOperatingStatement />}
        {activeReport === 'monthly-statement' && <MonthlyFinanceStatement />}
        {activeReport === 'finance-config' && <FinanceConfigSection />}
      </div>
    </div>
  );
};

export default Reports;
