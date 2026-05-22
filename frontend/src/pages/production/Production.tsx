import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    planned: 'bg-blue-50 text-blue-600',
    released: 'bg-purple-50 text-purple-600',
    in_progress: 'bg-green-50 text-green-600',
    completed: 'bg-gray-50 text-gray-600',
    closed: 'bg-gray-100 text-gray-500',
    pending: 'bg-gray-50 text-gray-500'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const CreateJobCardModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    job_number: 'JC-' + Date.now(),
    item_id: '',
    bom_id: '',
    routing_id: '',
    machine_id: '',
    die_id: '',
    planned_quantity: '',
    shift: 'Morning',
    planned_date: new Date().toISOString().split('T')[0]
  });

  const { data: items } = useQuery({
    queryKey: ['fgItems'],
    queryFn: () => api.get('/api/items?item_type=finished_goods').then(r => r.data.data)
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => api.get('/api/machines').then(r => r.data.data)
  });

  const { data: dies } = useQuery({
    queryKey: ['dies'],
    queryFn: () => api.get('/api/dies').then(r => r.data.data)
  });

  const { data: boms } = useQuery({
    queryKey: ['boms', form.item_id],
    queryFn: () => api.get(`/api/bom/${form.item_id}`).then(r => r.data.data),
    enabled: !!form.item_id
  });

  const { data: routings } = useQuery({
    queryKey: ['routings', form.item_id],
    queryFn: () => api.get(`/api/routing/${form.item_id}`).then(r => r.data.data),
    enabled: !!form.item_id
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/jobcards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      planned_quantity: parseFloat(form.planned_quantity),
      planned_date: new Date(form.planned_date).toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Create Job Card</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Job Number</label>
            <input
              value={form.job_number}
              onChange={e => setForm({ ...form, job_number: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Finished Goods Item</label>
            <select
              value={form.item_id}
              onChange={e => setForm({ ...form, item_id: e.target.value, bom_id: '', routing_id: '' })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            >
              <option value="">Select item...</option>
              {items?.map((item: any) => (
                <option key={item.id} value={item.id}>{item.item_name} ({item.item_code})</option>
              ))}
            </select>
          </div>
          {boms?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">BOM Revision</label>
              <select
                value={form.bom_id}
                onChange={e => setForm({ ...form, bom_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="">Select BOM...</option>
                {boms?.map((bom: any) => (
                  <option key={bom.id} value={bom.id}>Rev {bom.bom_revision} — {bom.status}</option>
                ))}
              </select>
            </div>
          )}
          {routings?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Routing</label>
              <select
                value={form.routing_id}
                onChange={e => setForm({ ...form, routing_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="">Select routing...</option>
                {routings?.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    Rev {r.routing_revision} — {r.operations?.length} operations
                  </option>
                ))}
              </select>
              {form.routing_id && routings?.find((r: any) => r.id === form.routing_id)?.operations && (
                <div className="mt-2 space-y-1">
                  {routings.find((r: any) => r.id === form.routing_id).operations.map((op: any) => (
                    <div key={op.id} className="flex items-center gap-2 text-xs text-text-secondary bg-surface px-2 py-1 rounded">
                      <span className="font-medium">Op {op.operation_sequence}</span>
                      <span>{op.operation_name}</span>
                      <span className="text-brand-primary">{op.operation_type}</span>
                      {op.is_outsourced && <span className="text-amber-600">Outsourced</span>}
                      {op.is_constraint && <span className="text-red-500">★ Constraint</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Machine</label>
              <select
                value={form.machine_id}
                onChange={e => setForm({ ...form, machine_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Select machine...</option>
                {machines?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.machine_name} {m.is_constraint ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Die</label>
              <select
                value={form.die_id}
                onChange={e => setForm({ ...form, die_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Select die...</option>
                {dies?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.die_number} — {d.die_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Planned Quantity</label>
              <input
                type="number"
                value={form.planned_quantity}
                onChange={e => setForm({ ...form, planned_quantity: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Shift</label>
              <select
                value={form.shift}
                onChange={e => setForm({ ...form, shift: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Night</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Planned Date</label>
            <input
              type="date"
              value={form.planned_date}
              onChange={e => setForm({ ...form, planned_date: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>
          {mutation.isError && (
            <p className="text-red-500 text-sm">Failed to create job card</p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create Job Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LogShotModal: React.FC<{ jobId: string; jobNumber: string; onClose: () => void }> = ({ jobId, jobNumber, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ shot_result: 'good', rejection_reason: '', logged_by: 'Operator' });
  const [shotCount, setShotCount] = useState(0);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/jobcards/${jobId}/shot`, data),
    onSuccess: () => {
      setShotCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['jobcards'] });
      queryClient.invalidateQueries({ queryKey: ['jobcard', jobId] });
    }
  });

  const logShot = (result: string) => {
    mutation.mutate({
      shot_number: shotCount + 1,
      shot_result: result,
      rejection_reason: result === 'reject' ? form.rejection_reason : null,
      logged_by: form.logged_by
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Shot Logging</h2>
            <p className="text-text-secondary text-sm">{jobNumber}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-brand-light rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-brand-primary">{shotCount}</p>
            <p className="text-text-secondary text-sm mt-1">Shots logged this session</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Operator</label>
            <input
              value={form.logged_by}
              onChange={e => setForm({ ...form, logged_by: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => logShot('good')}
              disabled={mutation.isPending}
              className="py-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
            >
              ✓ GOOD
            </button>
            <button
              onClick={() => logShot('reject')}
              disabled={mutation.isPending}
              className="py-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
            >
              ✗ REJECT
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Rejection Reason (if reject)</label>
            <select
              value={form.rejection_reason}
              onChange={e => setForm({ ...form, rejection_reason: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Select reason...</option>
              <option>Cold shut</option>
              <option>Porosity</option>
              <option>Flash</option>
              <option>Misrun</option>
              <option>Shrinkage</option>
              <option>Dimensional</option>
              <option>Surface defect</option>
            </select>
          </div>
          <button onClick={onClose} className="w-full px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const LogDowntimeModal: React.FC<{ jobId: string; jobNumber: string; onClose: () => void }> = ({ jobId, jobNumber, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    machine_id: '',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date().toISOString().slice(0, 16),
    duration_min: '',
    downtime_category: 'unplanned',
    reason_code: '',
    reason_detail: '',
    logged_by: 'Operator'
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => api.get('/api/machines').then(r => r.data.data)
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/jobcards/${jobId}/downtime`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      duration_min: parseInt(form.duration_min),
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Log Downtime</h2>
            <p className="text-text-secondary text-sm">{jobNumber}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Machine</label>
            <select
              value={form.machine_id}
              onChange={e => setForm({ ...form, machine_id: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Select machine...</option>
              {machines?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.machine_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">End Time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Duration (min)</label>
              <input
                type="number"
                value={form.duration_min}
                onChange={e => setForm({ ...form, duration_min: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Category</label>
              <select
                value={form.downtime_category}
                onChange={e => setForm({ ...form, downtime_category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="unplanned">Unplanned</option>
                <option value="planned">Planned</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Reason</label>
            <select
              value={form.reason_code}
              onChange={e => setForm({ ...form, reason_code: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            >
              <option value="">Select reason...</option>
              <option value="die_sticking">Die sticking</option>
              <option value="power_cut">Power cut</option>
              <option value="material_shortage">Material shortage</option>
              <option value="breakdown">Machine breakdown</option>
              <option value="setup">Setup / changeover</option>
              <option value="planned_maintenance">Planned maintenance</option>
              <option value="operator_break">Operator break</option>
              <option value="quality_hold">Quality hold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Details (optional)</label>
            <input
              value={form.reason_detail}
              onChange={e => setForm({ ...form, reason_detail: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Additional details..."
            />
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to log downtime</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Logging...' : 'Log Downtime'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UpdateOperationModal: React.FC<{ op: any; onClose: () => void }> = ({ op, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    status: op.status,
    actual_start: op.actual_start ? new Date(op.actual_start).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    actual_end: op.actual_end ? new Date(op.actual_end).toISOString().slice(0, 16) : '',
    operator_id: op.operator_id || '',
    notes: op.notes || ''
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/jobcards/operations/${op.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards'] });
      queryClient.invalidateQueries({ queryKey: ['jobcard', op.job_id] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      actual_start: form.actual_start ? new Date(form.actual_start).toISOString() : null,
      actual_end: form.actual_end ? new Date(form.actual_end).toISOString() : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Update Operation</h2>
            <p className="text-text-secondary text-sm">Op {op.operation_sequence} — {op.operation_name}</p>
            {op.is_outsourced && (
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Outsourced</span>
            )}
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Actual Start</label>
              <input
                type="datetime-local"
                value={form.actual_start}
                onChange={e => setForm({ ...form, actual_start: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Actual End</label>
              <input
                type="datetime-local"
                value={form.actual_end}
                onChange={e => setForm({ ...form, actual_end: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Operator</label>
            <input
              value={form.operator_id}
              onChange={e => setForm({ ...form, operator_id: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Operator name or ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              rows={2}
              placeholder="Any observations..."
            />
          </div>
          {op.is_outsourced && form.status === 'in_progress' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              This is an outsourced operation. Marking as In Progress will auto-draft a Job Work Order for the assigned vendor.
            </div>
          )}
          {op.operation_type === 'assembly' && form.status === 'in_progress' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              Assembly operation. Starting this will auto-issue assembly components from stores.
            </div>
          )}
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update operation</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const JobCardDetail: React.FC<{ job: any; onClose: () => void }> = ({ job, onClose }) => {
  const queryClient = useQueryClient();
  const [showShotModal, setShowShotModal] = useState(false);
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);
  const [selectedOp, setSelectedOp] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jobcard', job.id],
    queryFn: () => api.get(`/api/jobcards/${job.id}`).then(r => r.data.data),
    refetchInterval: 10000
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.put(`/api/jobcards/${job.id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobcards'] })
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      {showShotModal && <LogShotModal jobId={job.id} jobNumber={job.job_number} onClose={() => setShowShotModal(false)} />}
      {showDowntimeModal && <LogDowntimeModal jobId={job.id} jobNumber={job.job_number} onClose={() => setShowDowntimeModal(false)} />}
      {selectedOp && <UpdateOperationModal op={selectedOp} onClose={() => setSelectedOp(null)} />}

      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">{job.job_number}</h2>
            <p className="text-text-secondary text-sm">{job.shift} shift — {new Date(job.planned_date).toLocaleDateString('en-IN')}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl ml-2">✕</button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-brand-primary animate-pulse">Loading...</div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{data?.actual_quantity_good}</p>
                <p className="text-text-secondary text-xs">Good Parts</p>
              </div>
              <div className="bg-surface rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text-primary">{data?.planned_quantity}</p>
                <p className="text-text-secondary text-xs">Planned</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-brand-primary">{data?.shot_logs?.length || 0}</p>
                <p className="text-text-secondary text-xs">Total Shots</p>
              </div>
            </div>

            <div className="flex gap-2">
              {job.status === 'planned' && (
                <button
                  onClick={() => statusMutation.mutate('in_progress')}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                >
                  ▶ Start Job
                </button>
              )}
              {job.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => setShowShotModal(true)}
                    className="flex-1 py-3 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-dark"
                  >
                    + Log Shot
                  </button>
                  <button
                    onClick={() => setShowDowntimeModal(true)}
                    className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600"
                  >
                    ⏱ Downtime
                  </button>
                  <button
                    onClick={() => statusMutation.mutate('completed')}
                    className="flex-1 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600"
                  >
                    ✓ Complete
                  </button>
                </>
              )}
            </div>

            {data?.job_operations?.length > 0 && (
              <div>
                <h3 className="font-semibold text-text-primary mb-3 text-sm">Operations — click to update</h3>
                <div className="space-y-2">
                  {data.job_operations.map((op: any) => (
                    <div
                      key={op.id}
                      onClick={() => setSelectedOp(op)}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg cursor-pointer hover:bg-brand-light transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          op.status === 'completed' ? 'bg-green-400' :
                          op.status === 'in_progress' ? 'bg-brand-primary animate-pulse' :
                          op.status === 'on_hold' ? 'bg-amber-400' :
                          'bg-gray-300'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            Op {op.operation_sequence} — {op.operation_name}
                          </p>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-xs text-text-secondary">{op.operation_type}</span>
                            {op.is_outsourced && <span className="text-xs text-amber-600">Outsourced</span>}
                            {op.is_constraint && <span className="text-xs text-red-500">★ Constraint</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={op.status} />
                        <span className="text-text-secondary text-xs">→</span>
                      </div>
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
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      {showCreateModal && <CreateJobCardModal onClose={() => setShowCreateModal(false)} />}
      {selectedJob && <JobCardDetail job={selectedJob} onClose={() => setSelectedJob(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Production</h1>
          <p className="text-text-secondary text-sm mt-1">Job cards and shop floor tracking</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
        >
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
                  <td className="px-4 py-3 text-right font-medium text-green-600">{job.actual_quantity_good}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-brand-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
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
