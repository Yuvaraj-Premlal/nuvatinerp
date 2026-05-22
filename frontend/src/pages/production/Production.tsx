import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    planned: 'bg-blue-50 text-blue-600',
    released: 'bg-purple-50 text-purple-600',
    in_progress: 'bg-green-50 text-green-600',
    completed: 'bg-gray-50 text-gray-600',
    closed: 'bg-gray-100 text-gray-500'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const JobCardDetail: React.FC<{ job: any; onClose: () => void }> = ({ job, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['jobcard', job.id],
    queryFn: () => api.get(`/api/jobcards/${job.id}`).then(r => r.data.data)
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">{job.job_number}</h2>
            <p className="text-text-secondary text-sm">{job.shift} shift — {new Date(job.planned_date).toLocaleDateString('en-IN')}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-brand-primary animate-pulse">Loading...</div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text-primary">{data?.actual_quantity_good}</p>
                <p className="text-text-secondary text-xs">Good Parts</p>
              </div>
              <div className="bg-surface rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text-primary">{data?.planned_quantity}</p>
                <p className="text-text-secondary text-xs">Planned</p>
              </div>
              <div className="bg-surface rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text-primary">{data?.shot_logs?.length || 0}</p>
                <p className="text-text-secondary text-xs">Total Shots</p>
              </div>
            </div>

            {data?.job_operations?.length > 0 && (
              <div>
                <h3 className="font-semibold text-text-primary mb-3 text-sm">Operations</h3>
                <div className="space-y-2">
                  {data.job_operations.map((op: any) => (
                    <div key={op.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          op.status === 'completed' ? 'bg-green-400' :
                          op.status === 'in_progress' ? 'bg-brand-primary animate-pulse' :
                          'bg-gray-300'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            Op {op.operation_sequence} — {op.operation_name}
                          </p>
                          <p className="text-xs text-text-secondary">{op.operation_type}
                            {op.is_outsourced && ' · Outsourced'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={op.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data?.downtime_logs?.length > 0 && (
              <div>
                <h3 className="font-semibold text-text-primary mb-3 text-sm">Downtime Log</h3>
                <div className="space-y-2">
                  {data.downtime_logs.map((dt: any) => (
                    <div key={dt.id} className="flex justify-between p-3 bg-red-50 rounded-lg text-sm">
                      <span className="text-red-600">{dt.reason_code || dt.downtime_category}</span>
                      <span className="text-red-500 font-medium">{dt.duration_min} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data?.rejection_logs?.length > 0 && (
              <div>
                <h3 className="font-semibold text-text-primary mb-3 text-sm">Rejection Log</h3>
                <div className="space-y-2">
                  {data.rejection_logs.map((r: any) => (
                    <div key={r.id} className="flex justify-between p-3 bg-amber-50 rounded-lg text-sm">
                      <span className="text-amber-700">{r.defect_code || r.defect_description || 'Defect'}</span>
                      <span className="text-amber-600 font-medium">{r.quantity_rejected} pcs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Production: React.FC = () => {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobcards'],
    queryFn: () => api.get('/api/jobcards').then(r => r.data.data),
    refetchInterval: 30000
  });

  const filtered = jobs?.filter((j: any) =>
    statusFilter === 'all' || j.status === statusFilter
  );

  const summary = {
    total: jobs?.length || 0,
    inProgress: jobs?.filter((j: any) => j.status === 'in_progress').length || 0,
    planned: jobs?.filter((j: any) => j.status === 'planned').length || 0,
    completed: jobs?.filter((j: any) => j.status === 'completed').length || 0,
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading production data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {selectedJob && (
        <JobCardDetail job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Production</h1>
          <p className="text-text-secondary text-sm mt-1">Job cards and shop floor tracking</p>
        </div>
        <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          + New Job Card
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-brand-primary">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Total Jobs</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">In Progress</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{summary.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Planned</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{summary.planned}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-gray-300">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Completed</p>
          <p className="text-3xl font-bold text-gray-500 mt-1">{summary.completed}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'planned', 'released', 'in_progress', 'completed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-light">
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Job Number</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Shift</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Planned Date</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Planned Qty</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Good Parts</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Progress</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((job: any, i: number) => {
              const progress = job.planned_quantity > 0
                ? Math.round((job.actual_quantity_good / job.planned_quantity) * 100)
                : 0;
              return (
                <tr
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`border-t border-border hover:bg-brand-light cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}
                >
                  <td className="px-4 py-3 font-medium text-brand-primary">{job.job_number}</td>
                  <td className="px-4 py-3 text-text-secondary">{job.shift || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {job.planned_date ? new Date(job.planned_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">{job.planned_quantity}</td>
                  <td className="px-4 py-3 text-right font-medium text-text-primary">{job.actual_quantity_good}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-brand-primary h-1.5 rounded-full"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-text-secondary w-8 text-right">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={job.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered?.length === 0 && (
          <div className="text-center py-12 text-text-secondary">No job cards found</div>
        )}
      </div>
    </div>
  );
};

export default Production;
