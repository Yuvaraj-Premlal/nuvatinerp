import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const BufferGauge: React.FC<{ current: number; target: number; status: string }> = ({ current, target, status }) => {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const color = status === 'healthy' ? 'bg-green-400' : status === 'warning' ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">Buffer</span>
        <span className={`font-bold ${
          status === 'healthy' ? 'text-green-600' :
          status === 'warning' ? 'text-amber-600' : 'text-red-600'
        }`}>
          {current}h / {target}h target
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

const TOC: React.FC = () => {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['tocDashboard'],
    queryFn: () => api.get('/api/toc/dashboard').then(r => r.data.data),
    refetchInterval: 60000
  });

  const { data: detectData } = useQuery({
    queryKey: ['detectConstraint'],
    queryFn: () => api.get('/api/toc/detect-constraint').then(r => r.data.data),
    refetchInterval: 300000
  });

  const { data: queueData } = useQuery({
    queryKey: ['priorityQueue'],
    queryFn: () => api.get('/api/toc/priority-queue').then(r => r.data.data)
  });

  const { data: bufferData } = useQuery({
    queryKey: ['bufferStatus'],
    queryFn: () => api.get('/api/toc/buffer').then(r => r.data.data),
    refetchInterval: 60000
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading TOC data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">TOC Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Theory of Constraints — Drum Buffer Rope</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-brand-primary rounded-xl p-5 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Constraint Machine</p>
          <p className="text-xl font-bold">{dashboard?.constraint?.machine_name || 'Not configured'}</p>
          <div className="mt-4">
            <BufferGauge
              current={dashboard?.constraint?.current_buffer_hours || 0}
              target={dashboard?.constraint?.buffer_target_hours || 4}
              status={dashboard?.constraint?.buffer_status || 'unknown'}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-bold">{dashboard?.constraint?.oee || 0}%</p>
              <p className="text-blue-200 text-xs">OEE Today</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard?.constraint?.oee_target || 78}%</p>
              <p className="text-blue-200 text-xs">OEE Target</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Machine Load Detection</h3>
          {detectData?.all_machines?.map((machine: any) => (
            <div key={machine.machine_id} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-medium ${machine.is_current_constraint ? 'text-brand-primary' : 'text-text-primary'}`}>
                  {machine.machine_name}
                  {machine.is_current_constraint && ' ★'}
                </span>
                <span className={`font-bold ${
                  machine.load_percent > 80 ? 'text-red-500' :
                  machine.load_percent > 60 ? 'text-amber-500' : 'text-green-600'
                }`}>{machine.load_percent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    machine.load_percent > 80 ? 'bg-red-400' :
                    machine.load_percent > 60 ? 'bg-amber-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(machine.load_percent, 100)}%` }}
                ></div>
              </div>
              <p className="text-text-secondary text-xs mt-0.5">
                {machine.total_work_hours}h work / {machine.available_hours_per_week}h available
              </p>
            </div>
          ))}
          {detectData?.recommendation && (
            <div className="mt-3 bg-brand-light rounded-lg p-3">
              <p className="text-brand-primary text-xs font-medium">{detectData.recommendation}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Buffer Status</h3>
          {bufferData ? (
            <div className="space-y-4">
              <div className={`rounded-lg p-3 ${
                bufferData.buffer_status === 'healthy' ? 'bg-green-50' :
                bufferData.buffer_status === 'warning' ? 'bg-amber-50' :
                bufferData.buffer_status === 'critical' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <p className={`text-2xl font-bold ${
                  bufferData.buffer_status === 'healthy' ? 'text-green-600' :
                  bufferData.buffer_status === 'warning' ? 'text-amber-600' :
                  bufferData.buffer_status === 'critical' ? 'text-red-600' : 'text-gray-600'
                }`}>{bufferData.buffer_available_hours}h</p>
                <p className="text-text-secondary text-xs">Available of {bufferData.buffer_target_hours}h target</p>
                <p className={`text-xs font-medium mt-1 uppercase ${
                  bufferData.buffer_status === 'healthy' ? 'text-green-600' :
                  bufferData.buffer_status === 'warning' ? 'text-amber-600' :
                  'text-red-600'
                }`}>{bufferData.buffer_status}</p>
              </div>

              {bufferData.blocked_jobs?.length > 0 && (
                <div>
                  <p className="text-text-secondary text-xs font-medium mb-2">Blocked Jobs ({bufferData.total_blocked})</p>
                  {bufferData.blocked_jobs.map((job: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="font-medium text-text-primary">{job.job_number}</span>
                      <span className="text-amber-600">Blocked at: {job.blocked_at}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No buffer data available</p>
          )}
        </div>
      </div>

      {queueData?.queue?.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">
            Priority Queue — {queueData.constraint_machine}
            <span className="ml-2 text-text-secondary text-sm font-normal">
              {queueData.total_jobs_queued} jobs
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light">
                  <th className="text-left px-4 py-2 text-brand-primary font-medium">Rank</th>
                  <th className="text-left px-4 py-2 text-brand-primary font-medium">Job</th>
                  <th className="text-left px-4 py-2 text-brand-primary font-medium">Constraint Op</th>
                  <th className="text-center px-4 py-2 text-brand-primary font-medium">Op Status</th>
                  <th className="text-right px-4 py-2 text-brand-primary font-medium">Throughput/hr</th>
                  <th className="text-center px-4 py-2 text-brand-primary font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {queueData.queue.map((job: any, i: number) => (
                  <tr key={job.job_id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-brand-primary text-white' :
                        i === 1 ? 'bg-brand-light text-brand-primary' :
                        'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{job.job_number}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{job.constraint_operation}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        job.constraint_op_status === 'completed' ? 'bg-green-50 text-green-600' :
                        job.constraint_op_status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>{job.constraint_op_status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      {job.throughput_per_constraint_hour
                        ? `₹${job.throughput_per_constraint_hour?.toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary text-xs">
                      {job.progress_percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dashboard?.alerts?.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">
            Active Alerts
            <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
              {dashboard.alerts.length}
            </span>
          </h3>
          <div className="space-y-2">
            {dashboard.alerts.map((alert: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{alert.severity}</span>
                <p className="text-text-primary text-xs">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TOC;
