import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { fmtDate, fmtDateTime, toISTInput } from '../../utils/datetime';

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';

const statusColors: any = {
  draft: 'bg-gray-50 text-gray-500 border-gray-200',
  submitted: 'bg-blue-50 text-blue-600 border-blue-200',
  acknowledged: 'bg-purple-50 text-purple-600 border-purple-200',
  partially_fulfilled: 'bg-amber-50 text-amber-600 border-amber-200',
  fulfilled: 'bg-green-50 text-green-600 border-green-200',
  cancelled: 'bg-red-50 text-red-400 border-red-200'
};

const priorityColors: any = {
  normal: 'bg-gray-50 text-gray-500',
  urgent: 'bg-amber-50 text-amber-600',
  critical: 'bg-red-50 text-red-600'
};

const CreateMRModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    raised_by_dept: 'melting', raised_by: '', required_by_date: toISTInput(),
    priority: 'normal', requisition_type: 'direct', notes: '', mwo_id: ''
  });
  const [lines, setLines] = useState<any[]>([{ item_id: '', quantity_required: '', unit_of_measure: 'KG', notes: '' }]);

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const { data: mwos } = useQuery({ queryKey: ['mwos'], queryFn: () => api.get('/api/mwo').then(r => r.data.data) });
  const rawMaterials = items?.filter((i: any) => i.item_type === 'raw_material' || i.item_type === 'consumable') || [];

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/mr', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mrs'] }); onClose(); }
  });

  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">New Material Requisition</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Requesting Department <span className="text-red-500">*</span></label>
              <select value={form.raised_by_dept} onChange={e => setForm({ ...form, raised_by_dept: e.target.value, mwo_id: '' })} className={cls}>
                {['melting', 'casting', 'fettling', 'machining', 'assembly', 'quality', 'maintenance'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Requested By <span className="text-red-500">*</span></label>
              <input value={form.raised_by} onChange={e => setForm({ ...form, raised_by: e.target.value })} className={cls} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Required By Date <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={form.required_by_date} onChange={e => setForm({ ...form, required_by_date: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={cls}>
                {['normal', 'urgent', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Requisition Type <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ ...form, requisition_type: 'direct' })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${form.requisition_type === 'direct' ? 'bg-brand-primary text-white border-brand-primary' : 'border-border text-text-secondary hover:bg-surface'}`}>
                  Direct
                  <p className="text-xs font-normal mt-0.5 opacity-80">Goes into the product — ingots, inserts, packaging</p>
                </button>
                <button type="button" onClick={() => setForm({ ...form, requisition_type: 'indirect', mwo_id: '' })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${form.requisition_type === 'indirect' ? 'bg-amber-500 text-white border-amber-500' : 'border-border text-text-secondary hover:bg-surface'}`}>
                  Indirect
                  <p className="text-xs font-normal mt-0.5 opacity-80">Supports production — lubricants, spares, tools</p>
                </button>
              </div>
            </div>
          </div>
          {form.requisition_type === 'direct' && form.raised_by_dept === 'melting' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Link to Melt Work Order (optional)</label>
              <select value={form.mwo_id} onChange={e => setForm({ ...form, mwo_id: e.target.value })} className={cls}>
                <option value="">No MWO link</option>
                {mwos?.map((m: any) => <option key={m.id} value={m.id}>{m.mwo_number} — {m.furnace?.machine_code} — {fmtDate(m.planned_date)}</option>)}
              </select>
            </div>
          )}
          {form.requisition_type === 'direct' && form.raised_by_dept === 'casting' && (
            <div className="bg-surface border border-border rounded-lg p-3 text-xs text-text-secondary">
              Casting Work Order link — available once CWO module is built
            </div>
          )}
          {form.requisition_type === 'direct' && ['production', 'fettling', 'machining', 'assembly'].includes(form.raised_by_dept) && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Link to Job Card (optional)</label>
              <select value={form.mwo_id} onChange={e => setForm({ ...form, mwo_id: e.target.value })} className={cls}>
                <option value="">No Job Card link</option>
              </select>
              <p className="text-xs text-text-secondary mt-1">Job card linking available once production module is complete</p>
            </div>
          )}
          {['maintenance', 'quality', 'stores'].includes(form.raised_by_dept) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              {form.raised_by_dept === 'maintenance' ? '🔧 Maintenance requisition — no WO link required. Specify item and quantity needed for repair/PM.' : ''}
              {form.raised_by_dept === 'quality' ? '🔬 Quality requisition — specify consumables or calibration items needed.' : ''}
              {form.raised_by_dept === 'stores' ? '📦 Stores requisition — for internal replenishment.' : ''}
            </div>
          )}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={cls} rows={2} placeholder="Reason for requisition..." />
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium text-text-primary mb-2">Items Required</p>
            {lines.map((line, i) => (
              <div key={i} className="border border-border rounded-lg p-3 mb-2 space-y-2">
                <div className="flex justify-between">
                  <p className="text-xs font-medium text-text-primary">Item {i + 1}</p>
                  {lines.length > 1 && <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-xs text-red-500">Remove</button>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Item</label>
                    <select value={line.item_id} onChange={e => { const u = [...lines]; u[i].item_id = e.target.value; const item = rawMaterials.find((it: any) => it.id === e.target.value); if (item) u[i].unit_of_measure = item.unit_of_measure; setLines(u); }} className={cls}>
                      <option value="">Select item...</option>
                      {rawMaterials.map((it: any) => <option key={it.id} value={it.id}>{it.item_code} — {it.item_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Quantity</label>
                    <div className="flex gap-1">
                      <input type="number" value={line.quantity_required} onChange={e => { const u = [...lines]; u[i].quantity_required = e.target.value; setLines(u); }} className={cls} placeholder="0" />
                      <span className="px-2 py-2 text-xs text-text-secondary border border-border rounded-lg bg-surface">{line.unit_of_measure}</span>
                    </div>
                  </div>
                </div>
                <input value={line.notes} onChange={e => { const u = [...lines]; u[i].notes = e.target.value; setLines(u); }} className={cls} placeholder="Notes for this item (optional)" />
              </div>
            ))}
            <button onClick={() => setLines([...lines, { item_id: '', quantity_required: '', unit_of_measure: 'KG', notes: '' }])}
              className="w-full px-3 py-2 border border-dashed border-brand-primary text-brand-primary rounded-lg text-sm hover:bg-brand-light">
              + Add Item
            </button>
          </div>

          {mutation.isError && <p className="text-red-500 text-sm">Failed to create MR</p>}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({ ...form, mwo_id: form.mwo_id || null, lines: lines.filter(l => l.item_id && l.quantity_required) })}
              disabled={!form.raised_by || !form.raised_by_dept || lines.filter(l => l.item_id && l.quantity_required).length === 0 || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create MR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MRDetailPanel: React.FC<{ mr: any; onClose: () => void; onRefresh: () => void }> = ({ mr, onClose, onRefresh }) => {
  const queryClient = useQueryClient();
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateLines, setEscalateLines] = useState<any[]>([]);
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/api/suppliers').then(r => r.data.data) });

  const statusMutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/mr/${mr.id}/status`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mrs'] }); queryClient.invalidateQueries({ queryKey: ['alerts'] }); onRefresh(); onClose(); }
  });

  const fulfillMutation = useMutation({
    mutationFn: ({ line_id, qty }: any) => api.put(`/api/mr/line/${line_id}/fulfill`, { quantity_fulfilled: qty }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mrs'] }); onRefresh(); }
  });

  const escalateMutation = useMutation({
    mutationFn: (d: any) => api.post(`/api/mr/${mr.id}/escalate-pr`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prs'] }); queryClient.invalidateQueries({ queryKey: ['alerts'] }); setShowEscalate(false); alert('PR raised successfully. Purchase team has been notified.'); }
  });

  const [fulfillQtys, setFulfillQtys] = useState<Record<string, string>>({});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-text-primary">{mr.mr_number}</h2>
            <p className="text-text-secondary text-sm">{mr.raised_by_dept} — {mr.raised_by} | Required by {fmtDate(mr.required_by_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[mr.status]}`}>{mr.status.replace(/_/g, ' ')}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[mr.priority]}`}>{mr.priority}</span>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {mr.mwo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              Linked MWO: {mr.mwo.mwo_number} → {mr.mwo.furnace?.machine_code}
            </div>
          )}
          {mr.notes && <p className="text-sm text-text-secondary">{mr.notes}</p>}

          {/* Lines */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Items Requested</p>
            <table className="w-full text-sm">
              <thead><tr className="bg-brand-light">
                <th className="text-left px-3 py-2 text-brand-primary text-xs">Item</th>
                <th className="text-right px-3 py-2 text-brand-primary text-xs">Required</th>
                <th className="text-right px-3 py-2 text-brand-primary text-xs">Fulfilled</th>
                <th className="text-center px-3 py-2 text-brand-primary text-xs">Status</th>
                {mr.status === 'acknowledged' && <th className="text-center px-3 py-2 text-brand-primary text-xs">Fulfil</th>}
              </tr></thead>
              <tbody>
                {mr.lines?.map((line: any) => (
                  <tr key={line.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs"><p className="font-medium">{line.item?.item_name}</p><p className="text-text-secondary">{line.item?.item_code}</p></td>
                    <td className="px-3 py-2 text-xs text-right font-medium">{fmt(line.quantity_required)} {line.unit_of_measure}</td>
                    <td className="px-3 py-2 text-xs text-right font-medium text-green-600">{fmt(line.quantity_fulfilled)} {line.unit_of_measure}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${line.status === 'fulfilled' ? 'bg-green-50 text-green-600' : line.status === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>{line.status}</span>
                    </td>
                    {mr.status === 'acknowledged' && (
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <input type="number" value={fulfillQtys[line.id] || ''} onChange={e => setFulfillQtys({ ...fulfillQtys, [line.id]: e.target.value })}
                            className="w-16 px-2 py-1 border border-border rounded text-xs" placeholder="Qty" />
                          <button onClick={() => fulfillMutation.mutate({ line_id: line.id, qty: fulfillQtys[line.id] })}
                            disabled={!fulfillQtys[line.id] || fulfillMutation.isPending}
                            className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-100 disabled:opacity-50">
                            Fulfil
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              {mr.status === 'draft' && (
                <button onClick={() => statusMutation.mutate({ status: 'submitted' })}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark">
                  Submit MR
                </button>
              )}
              {mr.status === 'submitted' && (
                <button onClick={() => statusMutation.mutate({ status: 'acknowledged', acknowledged_by: 'Storekeeper' })}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                  Acknowledge (Stores)
                </button>
              )}
              {(mr.status === 'acknowledged' || mr.status === 'partially_fulfilled') && (
                <button onClick={() => setShowEscalate(!showEscalate)}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                  Escalate to Purchase (PR)
                </button>
              )}
              {['draft', 'submitted'].includes(mr.status) && (
                <button onClick={() => statusMutation.mutate({ status: 'cancelled', cancelled_by: 'Admin', cancellation_reason: 'Cancelled by user' })}
                  className="px-4 py-2 border border-red-300 text-red-500 rounded-lg text-sm hover:bg-red-50">
                  Cancel MR
                </button>
              )}
            </div>

            {/* Escalate to PR form */}
            {showEscalate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-amber-700">Raise Purchase Requisition to Purchase team</p>
                <p className="text-xs text-amber-600">Select items that cannot be fulfilled from current stock:</p>
                {mr.lines?.filter((l: any) => l.status !== 'fulfilled').map((line: any) => (
                  <div key={line.id} className="flex items-center gap-3">
                    <input type="checkbox" id={`esc-${line.id}`} onChange={e => {
                      if (e.target.checked) {
                        setEscalateLines([...escalateLines, { mr_line_id: line.id, item_id: line.item_id, quantity_required: line.quantity_required - line.quantity_fulfilled, unit_of_measure: line.unit_of_measure }]);
                      } else {
                        setEscalateLines(escalateLines.filter(el => el.mr_line_id !== line.id));
                      }
                    }} />
                    <label htmlFor={`esc-${line.id}`} className="text-xs text-amber-700">{line.item?.item_name} — {fmt(line.quantity_required - line.quantity_fulfilled)} {line.unit_of_measure} still needed</label>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  {escalateLines.map((el, i) => (
                    <div key={i}>
                      <label className="block text-xs text-text-secondary mb-1">Preferred supplier for {el.item_id}</label>
                      <select onChange={e => { const u = [...escalateLines]; u[i].preferred_supplier_id = e.target.value; setEscalateLines(u); }}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs">
                        <option value="">Any supplier</option>
                        {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <button onClick={() => escalateMutation.mutate({ lines: escalateLines, raised_by: 'Stores', required_by_date: mr.required_by_date, notes: `Escalated from MR ${mr.mr_number}` })}
                  disabled={escalateLines.length === 0 || escalateMutation.isPending}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  {escalateMutation.isPending ? 'Raising PR...' : 'Raise PR to Purchase'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MR: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMR, setSelectedMR] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mrs', filterStatus, filterDept],
    queryFn: () => {
      const q = [filterStatus ? `status=${filterStatus}` : '', filterDept ? `dept=${filterDept}` : ''].filter(Boolean).join('&');
      return api.get(`/api/mr${q ? '?' + q : ''}`).then(r => r.data.data);
    },
    staleTime: 0
  });

  const mrs = data || [];
  const pendingCount = mrs.filter((m: any) => ['submitted', 'acknowledged', 'partially_fulfilled'].includes(m.status)).length;

  return (
    <div className="space-y-6">
      {showCreate && <CreateMRModal onClose={() => setShowCreate(false)} />}
      {selectedMR && <MRDetailPanel mr={selectedMR} onClose={() => setSelectedMR(null)} onRefresh={refetch} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Material Requisitions</h1>
          <p className="text-text-secondary text-sm mt-1">Internal material requests across departments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
          + New MR
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase">Total MRs</p>
          <p className="text-3xl font-bold mt-1">{mrs.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase">Pending</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
          <p className="text-text-secondary text-xs mt-1">Awaiting action</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase">Fulfilled</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{mrs.filter((m: any) => m.status === 'fulfilled').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase">Critical</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{mrs.filter((m: any) => m.priority === 'critical').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm flex gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          <option value="">All Status</option>
          {['draft', 'submitted', 'acknowledged', 'partially_fulfilled', 'fulfilled', 'cancelled'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
          <option value="">All Departments</option>
          {['melting', 'casting', 'fettling', 'machining', 'assembly', 'quality', 'maintenance'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(filterStatus || filterDept) && <button onClick={() => { setFilterStatus(''); setFilterDept(''); }} className="text-xs text-brand-primary">Clear</button>}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-brand-primary animate-pulse">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-brand-light">
              <th className="text-left px-4 py-3 text-brand-primary font-medium">MR No</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Department</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Required By</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Items</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Type</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Priority</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Linked MWO</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
            </tr></thead>
            <tbody>
              {mrs.map((m: any, i: number) => (
                <tr key={m.id} onClick={() => setSelectedMR(m)}
                  className={`border-t border-border hover:bg-brand-light cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface'} ${m.priority === 'critical' ? 'border-l-2 border-l-red-400' : m.priority === 'urgent' ? 'border-l-2 border-l-amber-400' : ''}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{m.mr_number}</td>
                  <td className="px-4 py-3 text-xs capitalize">{m.raised_by_dept}<br /><span className="text-text-secondary">{m.raised_by}</span></td>
                  <td className="px-4 py-3 text-xs">{fmtDate(m.required_by_date)}</td>
                  <td className="px-4 py-3 text-xs">
                    {m.lines?.map((l: any) => (
                      <p key={l.id}>{l.item?.item_code} — {fmt(l.quantity_required)} {l.unit_of_measure}</p>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.requisition_type === 'indirect' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{m.requisition_type}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[m.priority]}`}>{m.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-primary">{m.mwo?.mwo_number || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[m.status]}`}>{m.status.replace(/_/g, ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {mrs.length === 0 && <div className="text-center py-12 text-text-secondary">No material requisitions found</div>}
        </div>
      )}
    </div>
  );
};

export default MR;
