import React, { useState } from 'react';
import { print8D } from '../../utils/eightd.pdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: any = {
    critical: 'bg-red-100 text-red-700',
    major: 'bg-amber-100 text-amber-700',
    minor: 'bg-blue-50 text-blue-600'
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[severity] || 'bg-gray-50 text-gray-500'}`}>{severity}</span>;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    open: 'bg-red-50 text-red-600',
    containment: 'bg-amber-50 text-amber-600',
    rca: 'bg-purple-50 text-purple-600',
    capa: 'bg-blue-50 text-blue-600',
    capa_complete: 'bg-teal-50 text-teal-600',
    verify: 'bg-indigo-50 text-indigo-600',
    closed: 'bg-green-50 text-green-600'
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>{status?.replace('_', ' ')}</span>;
};

const CreateComplaintModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    complaint_type: 'customer',
    title: '',
    description: '',
    severity: 'major',
    raised_by: '',
    customer_id: '',
    supplier_id: '',
    part_number: '',
    quantity_affected: '',
    raised_date: new Date().toISOString().split('T')[0]
  });

  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/api/customers').then(r => r.data.data) });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/api/suppliers').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/complaints', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaintSummary'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      quantity_affected: form.quantity_affected ? parseFloat(form.quantity_affected) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Raise Complaint / NCR</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Complaint Type</label>
              <select value={form.complaint_type} onChange={e => setForm({ ...form, complaint_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="customer">Customer Complaint (8D)</option>
                <option value="internal">Internal NCR</option>
                <option value="supplier">Supplier SCAR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="critical">Critical — Line stoppage</option>
                <option value="major">Major — Quality escape</option>
                <option value="minor">Minor — Observation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Brief title of the complaint" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              rows={3} placeholder="Detailed description — What, Where, When, How many" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Part Number</label>
              <input value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="e.g. FG-GBH-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Qty Affected</label>
              <input type="number" value={form.quantity_affected} onChange={e => setForm({ ...form, quantity_affected: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>

          {form.complaint_type === 'customer' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Customer</label>
              <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select customer...</option>
                {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
              </select>
            </div>
          )}

          {form.complaint_type === 'supplier' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select supplier...</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Raised By</label>
              <input value={form.raised_by} onChange={e => setForm({ ...form, raised_by: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
              <input type="date" value={form.raised_date} onChange={e => setForm({ ...form, raised_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>

          {form.complaint_type === 'customer' && (
            <div className="bg-brand-light rounded-lg p-3 text-xs text-brand-primary">
              8D report will be auto-created with all 8 steps. 5-day response deadline set automatically.
            </div>
          )}

          {mutation.isError && <p className="text-red-500 text-sm">Failed to create complaint</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              {mutation.isPending ? 'Raising...' : 'Raise Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ComplaintDetail: React.FC<{ complaint: any; onClose: () => void }> = ({ complaint, onClose }) => {
  const queryClient = useQueryClient();
  const [editingAction, setEditingAction] = useState<any>(null);
  const [actionForm, setActionForm] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ['complaint', complaint.id],
    queryFn: () => api.get(`/api/complaints/${complaint.id}`).then(r => r.data.data)
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/complaints/actions/${editingAction.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', complaint.id] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setEditingAction(null);
    }
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/api/complaints/${complaint.id}/close`, { closed_by: 'Quality Manager' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaintSummary'] });
      onClose();
    }
  });

  const startEdit = (action: any) => {
    setEditingAction(action);
    setActionForm({
      description: action.description,
      responsible_person: action.responsible_person || '',
      target_date: action.target_date ? new Date(action.target_date).toISOString().split('T')[0] : '',
      completion_date: action.completion_date ? new Date(action.completion_date).toISOString().split('T')[0] : '',
      status: action.status,
      evidence_notes: action.evidence_notes || ''
    });
  };

  const isOverdue = complaint.due_date && new Date(complaint.due_date) < new Date() && complaint.status !== 'closed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-text-primary">{complaint.complaint_number}</h2>
              <SeverityBadge severity={complaint.severity} />
              <StatusBadge status={complaint.status} />
              {complaint.is_repeat && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">REPEAT</span>}
            </div>
            <p className="text-text-secondary text-sm mt-1">{complaint.title}</p>
            {isOverdue && (
              <p className="text-red-500 text-xs mt-1">⚠ OVERDUE — Response was due {new Date(complaint.due_date).toLocaleDateString('en-IN')}</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-brand-primary animate-pulse">Loading...</div>
        ) : (
          <div className="p-5 space-y-5">
            {data?.description && (
              <div className="bg-surface rounded-lg p-4">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">Description</p>
                <div className="text-sm text-text-primary whitespace-pre-line">
                  {data.description?.split('\n').map((line: string, i: number) => (
                    <p key={i} className={`${line.startsWith('•') ? 'ml-2 mt-1' : i === 0 ? 'font-medium' : 'mt-2'}`}>{line}</p>
                  ))}
                </div>
                {data.part_number && <p className="text-xs text-text-secondary mt-2">Part: {data.part_number} {data.quantity_affected ? `| Qty affected: ${data.quantity_affected}` : ''}</p>}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary text-sm">
                  {complaint.complaint_type === 'customer' ? '8D Action Plan' : 'CAPA Actions'}
                </h3>
                <div className="flex gap-2">
                  <Print8DButton complaint={data} />
                  {data?.status !== 'closed' && (
                    <button
                      onClick={() => closeMutation.mutate()}
                      disabled={closeMutation.isPending}
                      className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50"
                    >
                      {closeMutation.isPending ? 'Closing...' : '✓ Close Complaint'}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {data?.actions?.map((action: any) => (
                  <div key={action.id} className={`rounded-lg border p-3 ${action.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-surface border-border'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${action.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {action.step_number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brand-primary">{action.action_type}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${action.status === 'completed' ? 'bg-green-100 text-green-700' : action.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                              {action.status}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">{action.description}</p>
                          {action.responsible_person && <p className="text-xs text-text-secondary mt-0.5">Owner: {action.responsible_person}</p>}
                          {action.target_date && <p className="text-xs text-text-secondary">Due: {new Date(action.target_date).toLocaleDateString('en-IN')}</p>}
                          {action.evidence_notes && <p className="text-xs text-brand-primary mt-1 bg-brand-light rounded px-2 py-1">{action.evidence_notes}</p>}
                        </div>
                      </div>
                      {data?.status !== 'closed' && (
                        <button onClick={() => startEdit(action)} className="text-xs text-brand-primary hover:text-brand-dark ml-2 flex-shrink-0">Edit</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {editingAction && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">{editingAction.action_type} — Update</h3>
                <button onClick={() => setEditingAction(null)} className="text-text-secondary">✕</button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Description / Findings</label>
                  <textarea value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Responsible Person</label>
                    <input value={actionForm.responsible_person} onChange={e => setActionForm({ ...actionForm, responsible_person: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Status</label>
                    <select value={actionForm.status} onChange={e => setActionForm({ ...actionForm, status: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Target Date</label>
                    <input type="date" value={actionForm.target_date} onChange={e => setActionForm({ ...actionForm, target_date: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Completion Date</label>
                    <input type="date" value={actionForm.completion_date} onChange={e => setActionForm({ ...actionForm, completion_date: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Evidence / Notes</label>
                  <input value={actionForm.evidence_notes} onChange={e => setActionForm({ ...actionForm, evidence_notes: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    placeholder="Evidence of completion..." />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingAction(null)} className="flex-1 px-3 py-2 border border-border rounded-lg text-xs text-text-secondary">Cancel</button>
                  <button onClick={() => updateMutation.mutate(actionForm)} disabled={updateMutation.isPending}
                    className="flex-1 px-3 py-2 bg-brand-primary text-white rounded-lg text-xs font-medium disabled:opacity-50">
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const Print8DButton: React.FC<{ complaint: any }> = ({ complaint }) => {
  const { data: company } = useQuery({ queryKey: ['companyConfig'], queryFn: () => api.get('/api/finance/config').then(r => r.data.data) });

  const handlePrint = () => {
    print8D(complaint, company);
  };

  return (
    <button onClick={handlePrint} className="text-xs bg-brand-light text-brand-primary px-3 py-1.5 rounded-lg hover:bg-blue-100">
      🖨 8D PDF
    </button>
  );
};

const Complaints: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: summary } = useQuery({
    queryKey: ['complaintSummary'],
    queryFn: () => api.get('/api/complaints/summary').then(r => r.data.data)
  });

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints', typeFilter],
    queryFn: () => api.get(`/api/complaints${typeFilter !== 'all' ? `?complaint_type=${typeFilter}` : ''}`).then(r => r.data.data)
  });

  return (
    <div className="space-y-6">
      {showCreate && <CreateComplaintModal onClose={() => setShowCreate(false)} />}
      {selectedComplaint && <ComplaintDetail complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Complaints & NCR</h2>
          <p className="text-text-secondary text-sm">Customer 8D, Internal NCR, Supplier SCAR</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600">
          + Raise Complaint
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Open</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{summary?.open || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Overdue</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{summary?.overdue || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-600">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Critical</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{summary?.critical || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-gray-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Repeat</p>
          <p className="text-3xl font-bold text-gray-500 mt-1">{summary?.repeat || 0}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'customer', 'internal', 'supplier'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-brand-primary text-white' : 'bg-white text-text-secondary hover:bg-surface border border-border'}`}>
            {t === 'all' ? 'All' : t === 'customer' ? 'Customer 8D' : t === 'internal' ? 'Internal NCR' : 'Supplier SCAR'}
            {t !== 'all' && summary && <span className="ml-1">({summary[t] || 0})</span>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-light">
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Number</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Title</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Date</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Due</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Severity</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints?.map((c: any, i: number) => {
              const isOverdue = c.due_date && new Date(c.due_date) < new Date() && c.status !== 'closed';
              const completedActions = c.actions?.filter((a: any) => a.status === 'completed').length || 0;
              const totalActions = c.actions?.length || 0;
              return (
                <tr key={c.id} onClick={() => setSelectedComplaint(c)}
                  className={`border-t border-border hover:bg-brand-light cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface'} ${isOverdue ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">
                    {c.complaint_number}
                    {c.is_repeat && <span className="ml-1 text-xs text-red-500">R</span>}
                  </td>
                  <td className="px-4 py-3 text-text-primary text-xs">{c.title}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-brand-light text-brand-primary px-2 py-0.5 rounded-full">
                      {c.complaint_type === 'customer' ? '8D' : c.complaint_type === 'internal' ? 'NCR' : 'SCAR'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(c.raised_date).toLocaleDateString('en-IN')}</td>
                  <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-text-secondary'}`}>
                    {c.due_date ? new Date(c.due_date).toLocaleDateString('en-IN') : '—'}
                    {isOverdue && ' ⚠'}
                  </td>
                  <td className="px-4 py-3 text-center"><SeverityBadge severity={c.severity} /></td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-center text-xs text-text-secondary">
                    {completedActions}/{totalActions} done
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {complaints?.length === 0 && (
          <div className="text-center py-12 text-text-secondary">No complaints found — good sign!</div>
        )}
      </div>
    </div>
  );
};

export default Complaints;
