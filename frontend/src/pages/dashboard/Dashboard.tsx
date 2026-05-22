import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  status?: 'good' | 'warn' | 'bad' | 'neutral';
}> = ({ label, value, sub, status = 'neutral' }) => {
  const statusColor = {
    good: 'border-green-400',
    warn: 'border-amber-400',
    bad: 'border-red-400',
    neutral: 'border-brand-primary'
  }[status];

  return (
    <div className={`bg-white rounded-xl p-5 border-l-4 ${statusColor} shadow-sm`}>
      <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
      {sub && <p className="text-text-secondary text-xs mt-1">{sub}</p>}
    </div>
  );
};

const AlertBadge: React.FC<{ severity: string; message: string }> = ({ severity, message }) => {
  const colors = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  }[severity] || 'bg-gray-50 border-gray-200 text-gray-700';

  return (
    <div className={`border rounded-lg px-3 py-2 text-xs ${colors}`}>
      <span className="font-medium uppercase mr-2">{severity}</span>
      {message}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ownerDashboard'],
    queryFn: () => api.get('/api/owner/dashboard').then(r => r.data.data),
    refetchInterval: 60000
  });

  const { data: factoryData } = useQuery({
    queryKey: ['factoryStatus'],
    queryFn: () => api.get('/api/factory/status').then(r => r.data.data),
    refetchInterval: 30000
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading dashboard...</div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
      Failed to load dashboard data
    </div>
  );

  const prod = data?.production;
  const fin = data?.financials;
  const factory = data?.factory_health;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Owner Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="bg-brand-light px-4 py-2 rounded-lg">
          <p className="text-brand-primary text-xs font-medium">
            Variable cost only — excludes depreciation, rent and overhead
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Good Parts Today"
          value={prod?.total_good_parts ?? 0}
          sub={`${prod?.total_shots ?? 0} shots fired`}
          status={prod?.total_good_parts > 0 ? 'good' : 'neutral'}
        />
        <MetricCard
          label="OEE — Availability"
          value={`${prod?.availability_percent ?? 0}%`}
          sub="Target 78%"
          status={(prod?.availability_percent ?? 0) >= 78 ? 'good' : 'warn'}
        />
        <MetricCard
          label="Rejection Rate"
          value={`${prod?.rejection_rate_percent ?? 0}%`}
          sub={`${prod?.total_rejections ?? 0} pcs rejected`}
          status={(prod?.rejection_rate_percent ?? 0) <= 1 ? 'good' : 'bad'}
        />
        <MetricCard
          label="Downtime"
          value={`${prod?.downtime_minutes ?? 0} min`}
          sub="Today"
          status={(prod?.downtime_minutes ?? 0) <= 30 ? 'good' : 'warn'}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Revenue Today"
          value={`₹${(fin?.total_revenue ?? 0).toLocaleString('en-IN')}`}
          status="neutral"
        />
        <MetricCard
          label="Variable Cost"
          value={`₹${(fin?.total_variable_cost ?? 0).toLocaleString('en-IN')}`}
          sub="Material + Energy + Labour"
          status="neutral"
        />
        <MetricCard
          label="Throughput"
          value={`₹${(fin?.total_throughput ?? 0).toLocaleString('en-IN')}`}
          sub="Revenue minus variable cost"
          status={fin?.total_throughput > 0 ? 'good' : 'neutral'}
        />
        <MetricCard
          label="Profit"
          value={`₹${(fin?.profit ?? 0).toLocaleString('en-IN')}`}
          sub={`After ₹${(fin?.operating_expense ?? 0).toLocaleString('en-IN')} opex`}
          status={fin?.profit > 0 ? 'good' : 'bad'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Cash Position</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Receivables</span>
              <span className="font-medium text-green-600">
                ₹{(data?.cash_position?.total_receivables ?? 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Payables</span>
              <span className="font-medium text-red-500">
                ₹{(data?.cash_position?.total_payables ?? 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="text-text-primary font-medium text-sm">Net Position</span>
              <span className={`font-bold ${(data?.cash_position?.net_position ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                ₹{(data?.cash_position?.net_position ?? 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Factory Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-sm">Constraint</span>
              <span className="text-xs font-medium bg-brand-light text-brand-primary px-2 py-1 rounded">
                {factory?.constraint_machine ?? 'Not set'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-sm">Active Jobs</span>
              <span className="font-medium text-text-primary">
                {factoryData?.factory_summary?.active_jobs ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-sm">Machines Running</span>
              <span className="font-medium text-text-primary">
                {factoryData?.factory_summary?.machines_in_production ?? 0} / {factoryData?.factory_summary?.machines_total ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-sm">Dispatch Due Today</span>
              <span className={`font-medium ${(factoryData?.factory_summary?.dispatch_due_today ?? 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {factoryData?.factory_summary?.dispatch_due_today ?? 0} orders
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Die Health</h3>
          <div className="space-y-3">
            {factory?.die_health?.length > 0 ? factory.die_health.map((die: any) => (
              <div key={die.die_number} className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">{die.die_number}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">
                    {die.shots_to_pm > 0 ? `${die.shots_to_pm.toLocaleString()} shots to PM` : 'PM overdue'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    die.pm_status === 'critical' ? 'bg-red-500' :
                    die.pm_status === 'warning' ? 'bg-amber-400' : 'bg-green-400'
                  }`}></span>
                </div>
              </div>
            )) : (
              <p className="text-text-secondary text-sm">No dies in production</p>
            )}
          </div>
        </div>
      </div>

      {factory?.alerts?.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">
            Active Alerts
            <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
              {factory.alerts.length}
            </span>
          </h3>
          <div className="space-y-2">
            {factory.alerts.map((alert: any, i: number) => (
              <AlertBadge key={i} severity={alert.severity} message={alert.message} />
            ))}
          </div>
        </div>
      )}

      {data?.per_part_summary?.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Per Part Summary — Today</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light">
                  <th className="text-left px-4 py-2 text-brand-primary font-medium rounded-l-lg">Part</th>
                  <th className="text-right px-4 py-2 text-brand-primary font-medium">Good Pcs</th>
                  <th className="text-right px-4 py-2 text-brand-primary font-medium">Selling Price</th>
                  <th className="text-right px-4 py-2 text-brand-primary font-medium">Variable Cost</th>
                  <th className="text-right px-4 py-2 text-brand-primary font-medium">Throughput/pc</th>
                  <th className="text-right px-4 py-2 text-brand-primary font-medium rounded-r-lg">Total Throughput</th>
                </tr>
              </thead>
              <tbody>
                {data.per_part_summary.map((part: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                    <td className="px-4 py-3 font-medium text-text-primary">{part.item_name}</td>
                    <td className="px-4 py-3 text-right text-text-primary">{part.good_parts}</td>
                    <td className="px-4 py-3 text-right text-text-primary">₹{part.selling_price}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">₹{part.variable_cost_per_part}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">₹{part.throughput_per_part}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-bold">₹{part.total_throughput?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
