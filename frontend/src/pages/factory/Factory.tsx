import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    in_production: 'bg-green-400 animate-pulse',
    idle: 'bg-gray-300',
    healthy: 'bg-green-400',
    warning: 'bg-amber-400',
    critical: 'bg-red-500 animate-pulse',
    green: 'bg-green-400',
    yellow: 'bg-amber-400',
    red: 'bg-red-500'
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-gray-300'}`}></span>;
};

const MachineCard: React.FC<{ machine: any }> = ({ machine }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border-t-4 ${machine.is_constraint ? 'border-brand-accent' : 'border-brand-primary'}`}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="flex items-center gap-2">
          <StatusDot status={machine.status} />
          <h3 className="font-semibold text-text-primary text-sm">{machine.machine_name}</h3>
          {machine.is_constraint && (
            <span className="text-xs bg-brand-accent text-white px-2 py-0.5 rounded-full">CONSTRAINT</span>
          )}
        </div>
        <p className="text-text-secondary text-xs mt-1">{machine.machine_code}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
        machine.status === 'in_production' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
      }`}>
        {machine.status === 'in_production' ? 'Running' : 'Idle'}
      </span>
    </div>

    {machine.current_job ? (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Job</span>
          <span className="font-medium text-text-primary">{machine.current_job.job_number}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Operation</span>
          <span className="font-medium text-text-primary">{machine.current_job.current_operation}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
          <div
            className="bg-brand-primary h-1.5 rounded-full transition-all"
            style={{ width: `${machine.current_job.progress_percent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">{machine.current_job.actual_quantity_good} / {machine.current_job.planned_quantity} pcs</span>
          <span className="text-brand-primary font-medium">{machine.current_job.progress_percent}%</span>
        </div>
      </div>
    ) : (
      <p className="text-text-secondary text-xs">No active job</p>
    )}

    <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-xs font-bold text-text-primary">{machine.today_oee}%</p>
        <p className="text-xs text-text-secondary">OEE</p>
      </div>
      <div>
        <p className="text-xs font-bold text-text-primary">{machine.today_shots}</p>
        <p className="text-xs text-text-secondary">Shots</p>
      </div>
      <div>
        <p className="text-xs font-bold text-text-primary">{machine.today_downtime_min}m</p>
        <p className="text-xs text-text-secondary">Downtime</p>
      </div>
    </div>
  </div>
);

const DieCard: React.FC<{ die: any }> = ({ die }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-text-primary text-sm">{die.die_number}</h4>
      <StatusDot status={die.pm_status} />
    </div>
    <p className="text-text-secondary text-xs mb-3">{die.die_name}</p>
    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
      <div
        className={`h-1.5 rounded-full ${
          die.pm_status === 'critical' ? 'bg-red-500' :
          die.pm_status === 'warning' ? 'bg-amber-400' : 'bg-green-400'
        }`}
        style={{ width: `${Math.min(die.pm_percent, 100)}%` }}
      ></div>
    </div>
    <div className="flex justify-between text-xs">
      <span className="text-text-secondary">{die.current_shot_count?.toLocaleString()} shots</span>
      <span className={`font-medium ${
        die.pm_status === 'critical' ? 'text-red-500' :
        die.pm_status === 'warning' ? 'text-amber-500' : 'text-green-600'
      }`}>
        {die.shots_to_pm > 0 ? `${die.shots_to_pm?.toLocaleString()} to PM` : 'PM overdue'}
      </span>
    </div>
  </div>
);

const MaterialRow: React.FC<{ item: any }> = ({ item }) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
    <div className="flex items-center gap-3">
      <StatusDot status={item.zone} />
      <div>
        <p className="text-sm font-medium text-text-primary">{item.item_name}</p>
        <p className="text-xs text-text-secondary">{item.item_code} — {item.storage_location}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold text-text-primary">
        {item.quantity_on_hand?.toLocaleString()} {item.unit_of_measure}
      </p>
      <p className="text-xs text-text-secondary">Reorder at {item.reorder_point?.toLocaleString()}</p>
    </div>
  </div>
);

const Factory: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['factoryStatus'],
    queryFn: () => api.get('/api/factory/status').then(r => r.data.data),
    refetchInterval: 30000
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading factory status...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Factory Floor</h1>
          <p className="text-text-secondary text-sm mt-1">Live status — refreshes every 30 seconds</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span>
            <span className="text-text-secondary">Running</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span>
            <span className="text-text-secondary">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span className="text-text-secondary">Critical</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Machines</p>
          <p className="text-3xl font-bold mt-1">
            {data?.factory_summary?.machines_in_production}
            <span className="text-lg text-blue-200"> / {data?.factory_summary?.machines_total}</span>
          </p>
          <p className="text-blue-200 text-xs mt-1">Running</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Active Jobs</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{data?.factory_summary?.active_jobs}</p>
          <p className="text-text-secondary text-xs mt-1">In progress</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Alerts</p>
          <p className={`text-3xl font-bold mt-1 ${data?.factory_summary?.alerts_unresolved > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {data?.factory_summary?.alerts_unresolved}
          </p>
          <p className="text-text-secondary text-xs mt-1">Unresolved</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Dispatch Today</p>
          <p className={`text-3xl font-bold mt-1 ${data?.factory_summary?.dispatch_due_today > 0 ? 'text-amber-500' : 'text-green-500'}`}>
            {data?.factory_summary?.dispatch_due_today}
          </p>
          <p className="text-text-secondary text-xs mt-1">Orders due</p>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3">Machines</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {data?.machines?.map((machine: any) => (
            <MachineCard key={machine.machine_id} machine={machine} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3">Die Health</h2>
          <div className="grid grid-cols-2 gap-3">
            {data?.dies?.length > 0 ? data.dies.map((die: any) => (
              <DieCard key={die.die_id} die={die} />
            )) : (
              <div className="col-span-2 bg-white rounded-xl p-6 shadow-sm text-center text-text-secondary text-sm">
                No dies in production
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3">Material Position</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            {data?.materials?.length > 0 ? data.materials.map((item: any) => (
              <MaterialRow key={item.item_id} item={item} />
            )) : (
              <p className="text-text-secondary text-sm text-center py-4">No items found</p>
            )}
          </div>
        </div>
      </div>

      {data?.job_flow?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3">Job Flow</h2>
          <div className="space-y-3">
            {data.job_flow.map((job: any) => (
              <div key={job.job_id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-primary text-sm">{job.job_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      job.status === 'in_progress' ? 'bg-green-50 text-green-600' :
                      job.status === 'planned' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>{job.status}</span>
                  </div>
                  <span className="text-sm font-medium text-brand-primary">{job.progress_percent}%</span>
                </div>
                <div className="flex gap-1">
                  {job.operations?.map((op: any, i: number) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${
                        op.status === 'completed' ? 'bg-green-400' :
                        op.status === 'in_progress' ? 'bg-brand-primary animate-pulse' :
                        'bg-gray-200'
                      }`}
                      title={op.name}
                    ></div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-text-secondary">
                  <span>Current: {job.current_operation}</span>
                  <span>{job.actual_quantity_good} / {job.planned_quantity} pcs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Factory;
