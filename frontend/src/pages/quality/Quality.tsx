import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const LogRejectionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    job_id: '',
    item_id: '',
    quantity_rejected: '',
    rejection_stage: 'casting',
    defect_code: '',
    defect_description: '',
    die_id: '',
    machine_id: '',
    alloy_lot: '',
    disposition: 'scrap',
    logged_by: 'QC Inspector'
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobcards'],
    queryFn: () => api.get('/api/jobcards').then(r => r.data.data)
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.get('/api/items').then(r => r.data.data)
  });

  const { data: dies } = useQuery({
    queryKey: ['dies'],
    queryFn: () => api.get('/api/dies').then(r => r.data.data)
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => api.get('/api/machines').then(r => r.data.data)
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/quality/rejection', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rejections'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      quantity_rejected: parseFloat(form.quantity_rejected)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Log Rejection</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Job Card</label>
              <select
                value={form.job_id}
                onChange={e => setForm({ ...form, job_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Select job...</option>
                {jobs?.map((j: any) => (
                  <option key={j.id} value={j.id}>{j.job_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Item</label>
              <select
                value={form.item_id}
                onChange={e => setForm({ ...form, item_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Select item...</option>
                {items?.map((i: any) => (
                  <option key={i.id} value={i.id}>{i.item_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Quantity Rejected</label>
              <input
                type="number"
                value={form.quantity_rejected}
                onChange={e => setForm({ ...form, quantity_rejected: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Rejection Stage</label>
              <select
                value={form.rejection_stage}
                onChange={e => setForm({ ...form, rejection_stage: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="incoming">Incoming</option>
                <option value="casting">Casting</option>
                <option value="machining">Machining</option>
                <option value="assembly">Assembly</option>
                <option value="final_inspection">Final Inspection</option>
                <option value="customer_return">Customer Return</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Defect Code</label>
              <select
                value={form.defect_code}
                onChange={e => setForm({ ...form, defect_code: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="">Select defect...</option>
                <option value="cold_shut">Cold Shut</option>
                <option value="porosity">Porosity</option>
                <option value="flash">Flash</option>
                <option value="misrun">Misrun</option>
                <option value="shrinkage">Shrinkage</option>
                <option value="dimensional">Dimensional</option>
                <option value="surface_defect">Surface Defect</option>
                <option value="machining_defect">Machining Defect</option>
                <option value="assembly_defect">Assembly Defect</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Disposition</label>
              <select
                value={form.disposition}
                onChange={e => setForm({ ...form, disposition: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="scrap">Scrap</option>
                <option value="rework">Rework</option>
                <option value="return_to_supplier">Return to Supplier</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Defect Description</label>
            <input
              value={form.defect_description}
              onChange={e => setForm({ ...form, defect_description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Describe the defect..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Die</label>
              <select
                value={form.die_id}
                onChange={e => setForm({ ...form, die_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Select die...</option>
                {dies?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.die_number}</option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Alloy Lot</label>
              <input
                value={form.alloy_lot}
                onChange={e => setForm({ ...form, alloy_lot: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="e.g. LOT-2026-05"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Logged By</label>
              <input
                value={form.logged_by}
                onChange={e => setForm({ ...form, logged_by: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {mutation.isError && <p className="text-red-500 text-sm">Failed to log rejection</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              {mutation.isPending ? 'Logging...' : 'Log Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LogInspectionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    job_id: '',
    inspection_type: 'first_article',
    inspector_id: 'QC Inspector',
    result: 'pass',
    lines: [
      { parameter_name: '', specification_min: '', specification_max: '', unit: 'mm', actual_value: '', result: 'ok' }
    ]
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobcards'],
    queryFn: () => api.get('/api/jobcards').then(r => r.data.data)
  });

  const addLine = () => {
    setForm({
      ...form,
      lines: [...form.lines, { parameter_name: '', specification_min: '', specification_max: '', unit: 'mm', actual_value: '', result: 'ok' }]
    });
  };

  const updateLine = (i: number, field: string, value: string) => {
    const lines = [...form.lines];
    lines[i] = { ...lines[i], [field]: value };
    setForm({ ...form, lines });
  };

  const removeLine = (i: number) => {
    setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  };

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/quality/inspection', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      lines: form.lines.map(l => ({
        ...l,
        specification_min: parseFloat(l.specification_min),
        specification_max: parseFloat(l.specification_max),
        actual_value: parseFloat(l.actual_value)
      }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Log Inspection</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Job Card</label>
              <select
                value={form.job_id}
                onChange={e => setForm({ ...form, job_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="">Select job...</option>
                {jobs?.map((j: any) => (
                  <option key={j.id} value={j.id}>{j.job_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Inspection Type</label>
              <select
                value={form.inspection_type}
                onChange={e => setForm({ ...form, inspection_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="incoming">Incoming</option>
                <option value="first_article">First Article</option>
                <option value="in_process">In Process</option>
                <option value="final">Final</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Inspector</label>
              <input
                value={form.inspector_id}
                onChange={e => setForm({ ...form, inspector_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Overall Result</label>
              <select
                value={form.result}
                onChange={e => setForm({ ...form, result: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="conditional">Conditional</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Inspection Parameters</label>
              <button type="button" onClick={addLine} className="text-xs text-brand-primary hover:text-brand-dark font-medium">
                + Add Parameter
              </button>
            </div>
            <div className="space-y-2">
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center bg-surface p-2 rounded-lg">
                  <input
                    value={line.parameter_name}
                    onChange={e => updateLine(i, 'parameter_name', e.target.value)}
                    placeholder="Parameter"
                    className="col-span-2 px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <input
                    type="number"
                    value={line.specification_min}
                    onChange={e => updateLine(i, 'specification_min', e.target.value)}
                    placeholder="Min"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <input
                    type="number"
                    value={line.specification_max}
                    onChange={e => updateLine(i, 'specification_max', e.target.value)}
                    placeholder="Max"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <input
                    type="number"
                    value={line.actual_value}
                    onChange={e => updateLine(i, 'actual_value', e.target.value)}
                    placeholder="Actual"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <div className="flex items-center gap-1">
                    <select
                      value={line.result}
                      onChange={e => updateLine(i, 'result', e.target.value)}
                      className="flex-1 px-1 py-1.5 border border-border rounded text-xs focus:outline-none"
                    >
                      <option value="ok">OK</option>
                      <option value="nok">NOK</option>
                    </select>
                    {form.lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {mutation.isError && <p className="text-red-500 text-sm">Failed to log inspection</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Quality: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rejections');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);

  const { data: rejections, isLoading } = useQuery({
    queryKey: ['rejections'],
    queryFn: () => api.get('/api/quality/rejections').then(r => r.data.data)
  });

  const summary = {
    total: rejections?.length || 0,
    scrap: rejections?.filter((r: any) => r.disposition === 'scrap').length || 0,
    rework: rejections?.filter((r: any) => r.disposition === 'rework').length || 0,
    totalQty: rejections?.reduce((s: number, r: any) => s + r.quantity_rejected, 0) || 0
  };

  return (
    <div className="space-y-6">
      {showRejectionModal && <LogRejectionModal onClose={() => setShowRejectionModal(false)} />}
      {showInspectionModal && <LogInspectionModal onClose={() => setShowInspectionModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Quality</h1>
          <p className="text-text-secondary text-sm mt-1">Inspections and rejection tracking</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInspectionModal(true)}
            className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            + Log Inspection
          </button>
          <button
            onClick={() => setShowRejectionModal(true)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            + Log Rejection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-brand-primary">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Total Events</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Total Rejected</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{summary.totalQty} pcs</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Scrapped</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{summary.scrap}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Rework</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{summary.rework}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['rejections', 'inspections'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'rejections' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Defect</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Stage</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Qty</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {rejections?.map((r: any, i: number) => (
                <tr key={r.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(r.logged_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{r.defect_code?.replace('_', ' ') || '—'}</p>
                    <p className="text-text-secondary text-xs">{r.defect_description || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{r.rejection_stage || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{r.quantity_rejected}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.disposition === 'scrap' ? 'bg-red-50 text-red-600' :
                      r.disposition === 'rework' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {r.disposition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rejections?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No rejections logged</div>
          )}
        </div>
      )}

      {activeTab === 'inspections' && (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center text-text-secondary">
          <p>Inspection records will appear here after logging</p>
          <button
            onClick={() => setShowInspectionModal(true)}
            className="mt-4 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark"
          >
            + Log First Inspection
          </button>
        </div>
      )}
    </div>
  );
};

export default Quality;
