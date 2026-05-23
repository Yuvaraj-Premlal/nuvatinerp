import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    open: 'bg-red-50 text-red-600',
    in_progress: 'bg-blue-50 text-blue-600',
    completed: 'bg-green-50 text-green-600',
    scheduled: 'bg-amber-50 text-amber-600',
    overdue: 'bg-red-100 text-red-700'
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>{status?.replace('_', ' ')}</span>;
};

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: any = {
    preventive: 'bg-green-50 text-green-600',
    breakdown: 'bg-red-50 text-red-600',
    calibration: 'bg-blue-50 text-blue-600',
    predictive: 'bg-purple-50 text-purple-600'
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[type] || 'bg-gray-50 text-gray-500'}`}>{type}</span>;
};

const CreateWOModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    machine_id: '',
    maintenance_type: 'preventive',
    description: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    assigned_to: '',
    raised_by: ''
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => api.get('/api/machines').then(r => r.data.data)
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/maintenance/work-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceWOs'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceDashboard'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Create Work Order</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Machine</label>
              <select value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
                <option value="">Select machine...</option>
                {machines?.map((m: any) => <option key={m.id} value={m.id}>{m.machine_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
              <select value={form.maintenance_type} onChange={e => setForm({ ...form, maintenance_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="preventive">Preventive</option>
                <option value="breakdown">Breakdown</option>
                <option value="calibration">Calibration</option>
                <option value="predictive">Predictive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              rows={3} placeholder="Describe the maintenance required..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Assign To</label>
              <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Technician name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Raised By</label>
            <input value={form.raised_by} onChange={e => setForm({ ...form, raised_by: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Your name" />
          </div>
          {form.maintenance_type === 'breakdown' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              Breakdown alert will be raised automatically and visible on owner dashboard.
            </div>
          )}
          {mutation.isError && <p className="text-red-500 text-sm">Failed to create work order</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create WO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UpdateWOModal: React.FC<{ wo: any; onClose: () => void }> = ({ wo, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    status: wo.status,
    findings: wo.findings || '',
    action_taken: wo.action_taken || '',
    assigned_to: wo.assigned_to || '',
    downtime_minutes: wo.downtime_minutes || '',
    cost: wo.cost || '',
    started_at: wo.started_at ? new Date(wo.started_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    completed_at: wo.completed_at ? new Date(wo.completed_at).toISOString().slice(0, 16) : ''
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/maintenance/work-orders/${wo.id}`, { ...data, machine_id: wo.machine_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceWOs'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceDashboard'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      downtime_minutes: form.downtime_minutes ? parseFloat(String(form.downtime_minutes)) : null,
      cost: form.cost ? parseFloat(String(form.cost)) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Update Work Order</h2>
            <p className="text-text-secondary text-sm">{wo.wo_number} — {wo.machine?.machine_name}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Assigned To</label>
              <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Started At</label>
              <input type="datetime-local" value={form.started_at} onChange={e => setForm({ ...form, started_at: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Completed At</label>
              <input type="datetime-local" value={form.completed_at} onChange={e => setForm({ ...form, completed_at: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Downtime (min)</label>
              <input type="number" value={form.downtime_minutes} onChange={e => setForm({ ...form, downtime_minutes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Cost (₹)</label>
              <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Findings</label>
            <textarea value={form.findings} onChange={e => setForm({ ...form, findings: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              rows={2} placeholder="What was found during inspection..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Action Taken</label>
            <textarea value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              rows={2} placeholder="What was done to fix/maintain..." />
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Updating...' : 'Update WO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddSparePartModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    part_code: '',
    part_name: '',
    machine_id: '',
    description: '',
    unit_of_measure: 'NOS',
    quantity_on_hand: '',
    reorder_point: '2',
    unit_cost: '',
    storage_location: '',
    is_critical: false
  });

  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/maintenance/spare-parts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['spareParts'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      quantity_on_hand: parseFloat(form.quantity_on_hand),
      reorder_point: parseFloat(form.reorder_point),
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Spare Part</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Part Code</label>
              <input value={form.part_code} onChange={e => setForm({ ...form, part_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="e.g. SP-DCM-001" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Part Name</label>
              <input value={form.part_name} onChange={e => setForm({ ...form, part_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Machine</label>
              <select value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">General / All machines</option>
                {machines?.map((m: any) => <option key={m.id} value={m.id}>{m.machine_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Unit</label>
              <select value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option>NOS</option><option>SET</option><option>KG</option><option>LTR</option><option>MTR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Qty on Hand</label>
              <input type="number" value={form.quantity_on_hand} onChange={e => setForm({ ...form, quantity_on_hand: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Reorder Point</label>
              <input type="number" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Unit Cost (₹)</label>
              <input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Storage Location</label>
              <input value={form.storage_location} onChange={e => setForm({ ...form, storage_location: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="e.g. Maintenance Store" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="critical" checked={form.is_critical} onChange={e => setForm({ ...form, is_critical: e.target.checked })} />
            <label htmlFor="critical" className="text-sm text-text-primary">Critical spare — triggers alert when below reorder point</label>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add spare part</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Spare Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Maintenance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateWO, setShowCreateWO] = useState(false);
  const [showAddSpare, setShowAddSpare] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any>(null);

  const { data: dashboard } = useQuery({
    queryKey: ['maintenanceDashboard'],
    queryFn: () => api.get('/api/maintenance/dashboard').then(r => r.data.data),
    refetchInterval: 60000
  });

  const { data: workOrders, isLoading: woLoading } = useQuery({
    queryKey: ['maintenanceWOs'],
    queryFn: () => api.get('/api/maintenance/work-orders').then(r => r.data.data)
  });

  const { data: schedules } = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: () => api.get('/api/maintenance/schedules').then(r => r.data.data)
  });

  const { data: spareParts } = useQuery({
    queryKey: ['spareParts'],
    queryFn: () => api.get('/api/maintenance/spare-parts').then(r => r.data.data)
  });

  const { data: mtbfData } = useQuery({
    queryKey: ['mtbfMttr'],
    queryFn: () => api.get('/api/maintenance/mtbf-mttr').then(r => r.data.data)
  });

  return (
    <div className="space-y-6">
      {showCreateWO && <CreateWOModal onClose={() => setShowCreateWO(false)} />}
      {showAddSpare && <AddSparePartModal onClose={() => setShowAddSpare(false)} />}
      {selectedWO && <UpdateWOModal wo={selectedWO} onClose={() => setSelectedWO(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Maintenance</h1>
          <p className="text-text-secondary text-sm mt-1">PM schedules, work orders and spare parts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateWO(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
            + Work Order
          </button>
          {activeTab === 'spares' && (
            <button onClick={() => setShowAddSpare(true)} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600">
              + Spare Part
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Open WOs</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{dashboard?.open_work_orders || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Breakdowns (MTD)</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{dashboard?.breakdowns_this_month || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Overdue PM</p>
          <p className="text-3xl font-bold text-purple-500 mt-1">{dashboard?.overdue_schedules || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Low Spares</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{dashboard?.low_spare_parts || 0}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['dashboard', 'work-orders', 'schedules', 'spares', 'mtbf'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-brand-primary text-white' : 'bg-white text-text-secondary hover:bg-surface border border-border'}`}>
            {tab === 'work-orders' ? 'Work Orders' : tab === 'spares' ? 'Spare Parts' : tab === 'mtbf' ? 'MTBF / MTTR' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-4">Upcoming PM (Next 7 Days)</h3>
            {dashboard?.upcoming_pm?.length > 0 ? (
              <div className="space-y-2">
                {dashboard.upcoming_pm.map((pm: any) => (
                  <div key={pm.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{pm.machine?.machine_name}</p>
                      <p className="text-xs text-text-secondary">{pm.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-amber-600">{new Date(pm.scheduled_date).toLocaleDateString('en-IN')}</p>
                      <p className="text-xs text-text-secondary capitalize">{pm.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-sm">No PM scheduled this week</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-4">Recent Work Orders</h3>
            {dashboard?.recent_work_orders?.length > 0 ? (
              <div className="space-y-2">
                {dashboard.recent_work_orders.slice(0, 5).map((wo: any) => (
                  <div key={wo.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{wo.wo_number}</p>
                      <p className="text-xs text-text-secondary">{wo.machine?.machine_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TypeBadge type={wo.maintenance_type} />
                      <StatusBadge status={wo.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-sm">No work orders yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'work-orders' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">WO Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Machine</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Description</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Assigned To</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Downtime</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {workOrders?.map((wo: any, i: number) => (
                <tr key={wo.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{wo.wo_number}</td>
                  <td className="px-4 py-3 text-text-primary text-xs">{wo.machine?.machine_name}</td>
                  <td className="px-4 py-3"><TypeBadge type={wo.maintenance_type} /></td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-xs truncate">{wo.description}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{wo.assigned_to || '—'}</td>
                  <td className="px-4 py-3 text-right text-xs text-text-secondary">{wo.downtime_minutes ? `${wo.downtime_minutes} min` : '—'}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={wo.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {wo.status !== 'completed' && (
                      <button onClick={() => setSelectedWO(wo)} className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100">
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {workOrders?.length === 0 && <div className="text-center py-12 text-text-secondary">No work orders found</div>}
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-end p-4 border-b border-border">
            <button className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
              + Schedule PM
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Machine</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Title</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Frequency</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Scheduled Date</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules?.map((s: any, i: number) => (
                <tr key={s.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-text-primary">{s.machine?.machine_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{s.title}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-brand-light text-brand-primary px-2 py-0.5 rounded-full capitalize">{s.frequency}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(s.scheduled_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {schedules?.length === 0 && <div className="text-center py-12 text-text-secondary">No PM schedules found</div>}
        </div>
      )}

      {activeTab === 'spares' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Part Code</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Part Name</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Machine</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Location</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">On Hand</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Reorder At</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Unit Cost</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Critical</th>
              </tr>
            </thead>
            <tbody>
              {spareParts?.map((sp: any, i: number) => (
                <tr key={sp.id} className={`border-t border-border ${sp.quantity_on_hand <= sp.reorder_point ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{sp.part_code}</td>
                  <td className="px-4 py-3 text-text-primary">{sp.part_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{sp.machine_id ? 'Linked' : 'General'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{sp.storage_location || '—'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${sp.quantity_on_hand <= sp.reorder_point ? 'text-red-500' : 'text-green-600'}`}>
                    {sp.quantity_on_hand} {sp.unit_of_measure}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">{sp.reorder_point}</td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">{sp.unit_cost ? `₹${sp.unit_cost}` : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {sp.is_critical && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Critical</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {spareParts?.length === 0 && <div className="text-center py-12 text-text-secondary">No spare parts found</div>}
        </div>
      )}

      {activeTab === 'mtbf' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Machine</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Breakdowns</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">MTTR (min)</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">MTBF (min)</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Last PM</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Open WOs</th>
              </tr>
            </thead>
            <tbody>
              {mtbfData?.map((m: any, i: number) => (
                <tr key={m.machine_id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-text-primary">{m.machine_name}</td>
                  <td className={`px-4 py-3 text-right font-bold ${m.total_breakdowns > 0 ? 'text-red-500' : 'text-green-600'}`}>{m.total_breakdowns}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">{m.mttr_minutes > 0 ? `${m.mttr_minutes} min` : '—'}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">{m.mtbf_minutes > 0 ? `${Math.round(m.mtbf_minutes / 60)} hrs` : '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{m.last_pm_date ? new Date(m.last_pm_date).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${m.open_work_orders > 0 ? 'text-amber-500' : 'text-green-600'}`}>{m.open_work_orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
