import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    charging: 'bg-blue-50 text-blue-600 border-blue-200',
    melting: 'bg-orange-50 text-orange-600 border-orange-200',
    degassing: 'bg-purple-50 text-purple-600 border-purple-200',
    ready: 'bg-green-50 text-green-600 border-green-200',
    transferred: 'bg-teal-50 text-teal-600 border-teal-200',
    closed: 'bg-gray-50 text-gray-500 border-gray-200',
    rejected: 'bg-red-50 text-red-600 border-red-200'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
      {status}
    </span>
  );
};

const ChemistryBar: React.FC<{ label: string; actual: number; min?: number; max?: number }> = ({ label, actual, min, max }) => {
  const inSpec = (!min || actual >= min) && (!max || actual <= max);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 text-text-secondary font-medium">{label}</span>
      <span className={`font-bold ${inSpec ? 'text-green-600' : 'text-red-500'}`}>{actual?.toFixed(2) || '—'}</span>
      {(min || max) && <span className="text-text-secondary">({min || '—'} – {max || '—'})</span>}
      {actual && <span className={`ml-1 ${inSpec ? 'text-green-500' : 'text-red-500'}`}>{inSpec ? '✓' : '✗'}</span>}
    </div>
  );
};

const CreateMeltModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'basic' | 'charge' | 'scrap'>('basic');
  const [form, setForm] = useState<any>({
    furnace_id: '', alloy_grade_id: '', mwo_id: '', shift: 'A',
    charge_date: new Date().toISOString().slice(0, 16),
    fresh_ingot_weight: '', operator_id: '',
    lining_condition: 'good', ambient_temp_c: '', ambient_humidity_pct: '',
    flux_type: '', flux_quantity_kg: '',
    degassing_method: 'rotary', degassing_medium: 'nitrogen', degassing_duration_min: '',
    notes: ''
  });
  const [chargeLines, setChargeLines] = useState<any[]>([{ item_id: '', batch_number: '', grn_id: '', weight_charged: '' }]);
  const [scrapLines, setScrapLines] = useState<any[]>([]);

  const { data: furnaces } = useQuery({ queryKey: ['furnaces'], queryFn: () => api.get('/api/melt/furnaces').then(r => r.data.data) });
  const { data: mwosData } = useQuery({ queryKey: ['mwos', 'released'], queryFn: () => api.get('/api/mwo?status=released').then(r => r.data.data) });
  const { data: alloyGrades } = useQuery({ queryKey: ['alloyGrades'], queryFn: () => api.get('/api/melt/alloy-grades').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const { data: batches } = useQuery({ queryKey: ['batch'], queryFn: () => api.get('/api/batch').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/melt/records', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meltRecords'] }); onClose(); }
  });

  const rawMaterials = items?.filter((i: any) => i.item_type === 'raw_material') || [];

  const handleSubmit = () => {
    mutation.mutate({
      ...form,
      fresh_ingot_weight: parseFloat(form.fresh_ingot_weight || '0'),
      flux_quantity_kg: form.flux_quantity_kg ? parseFloat(form.flux_quantity_kg) : null,
      degassing_duration_min: form.degassing_duration_min ? parseFloat(form.degassing_duration_min) : null,
      ambient_temp_c: form.ambient_temp_c ? parseFloat(form.ambient_temp_c) : null,
      ambient_humidity_pct: form.ambient_humidity_pct ? parseFloat(form.ambient_humidity_pct) : null,
      charge_lines: chargeLines.filter(l => l.item_id && l.weight_charged),
      return_scrap_lines: scrapLines.filter(l => l.scrap_type && l.weight_kg)
    });
  };

  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-text-primary">New Melt Charge</h2>
            <p className="text-text-secondary text-sm">Create melt charge record</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="flex gap-2 px-5 pt-4">
          {['basic', 'charge', 'scrap'].map(s => (
            <button key={s} onClick={() => setStep(s as any)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${step === s ? 'bg-brand-primary text-white' : 'bg-surface text-text-secondary hover:bg-gray-100'}`}>
              {s === 'basic' ? 'Basic Info' : s === 'charge' ? 'Charge Lines' : 'Return Scrap'}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-4">
          {step === 'basic' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                <label className="block text-xs font-medium text-amber-700 mb-1">Link to Melt Work Order (recommended)</label>
                <select value={form.mwo_id} onChange={e => {
                  const mwo = mwosData?.find((m: any) => m.id === e.target.value);
                  setForm({ ...form, mwo_id: e.target.value,
                    furnace_id: mwo?.furnace_id || form.furnace_id,
                    alloy_grade_id: mwo?.alloy_spec_id || form.alloy_grade_id
                  });
                }} className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">No MWO — standalone melt</option>
                  {mwosData?.map((m: any) => <option key={m.id} value={m.id}>{m.mwo_number} — {m.furnace?.machine_code} — {m.alloy_spec?.item?.item_code} — {fmt(m.planned_charge_weight)} KG</option>)}
                </select>
                {form.mwo_id && <p className="text-xs text-amber-600 mt-1">✓ Furnace and alloy auto-filled from MWO</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Furnace <span className="text-red-500">*</span></label>
                  <select value={form.furnace_id} onChange={e => setForm({ ...form, furnace_id: e.target.value })} className={cls} required>
                    <option value="">Select furnace...</option>
                    {furnaces?.map((f: any) => <option key={f.id} value={f.id}>{f.machine_code} — {f.machine_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Alloy Material <span className="text-red-500">*</span></label>
                  <select value={form.alloy_grade_id} onChange={e => setForm({ ...form, alloy_grade_id: e.target.value })} className={cls} required>
                    <option value="">Select alloy...</option>
                    {alloyGrades?.map((g: any) => <option key={g.id} value={g.id}>{g.item?.item_code} — {g.item?.item_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Shift</label>
                  <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} className={cls}>
                    {['A', 'B', 'C', 'Day', 'Night'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Charge Date</label>
                  <input type="datetime-local" value={form.charge_date} onChange={e => setForm({ ...form, charge_date: e.target.value })} className={cls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Lining Condition</label>
                  <select value={form.lining_condition} onChange={e => setForm({ ...form, lining_condition: e.target.value })} className={cls}>
                    {['good', 'fair', 'poor'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Fresh Ingot Weight (KG)</label>
                  <input type="number" value={form.fresh_ingot_weight} onChange={e => setForm({ ...form, fresh_ingot_weight: e.target.value })} className={cls} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Operator</label>
                  <input value={form.operator_id} onChange={e => setForm({ ...form, operator_id: e.target.value })} className={cls} placeholder="Operator name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Ambient Temp (°C)</label>
                  <input type="number" value={form.ambient_temp_c} onChange={e => setForm({ ...form, ambient_temp_c: e.target.value })} className={cls} placeholder="e.g. 32" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Humidity (%)</label>
                  <input type="number" value={form.ambient_humidity_pct} onChange={e => setForm({ ...form, ambient_humidity_pct: e.target.value })} className={cls} placeholder="e.g. 65" />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium text-text-primary mb-2">Degassing</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Method</label>
                    <select value={form.degassing_method} onChange={e => setForm({ ...form, degassing_method: e.target.value })} className={cls}>
                      {['rotary', 'lance', 'tablet', 'none'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Medium</label>
                    <select value={form.degassing_medium} onChange={e => setForm({ ...form, degassing_medium: e.target.value })} className={cls}>
                      {['nitrogen', 'argon', 'tablet', 'none'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Duration (min)</label>
                    <input type="number" value={form.degassing_duration_min} onChange={e => setForm({ ...form, degassing_duration_min: e.target.value })} className={cls} placeholder="e.g. 15" />
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium text-text-primary mb-2">Flux</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Flux Type</label>
                    <input value={form.flux_type} onChange={e => setForm({ ...form, flux_type: e.target.value })} className={cls} placeholder="e.g. Coverall-11" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Flux Qty (KG)</label>
                    <input type="number" value={form.flux_quantity_kg} onChange={e => setForm({ ...form, flux_quantity_kg: e.target.value })} className={cls} placeholder="0" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={cls} rows={2} placeholder="Any observations..." />
              </div>
            </>
          )}
          {step === 'charge' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Enter ingot batches charged into this melt.</p>
              {chargeLines.map((line, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-medium text-text-primary">Batch {i + 1}</p>
                    {chargeLines.length > 1 && <button onClick={() => setChargeLines(chargeLines.filter((_, j) => j !== i))} className="text-xs text-red-500">Remove</button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Item</label>
                      <select value={line.item_id} onChange={e => { const u = [...chargeLines]; u[i].item_id = e.target.value; setChargeLines(u); }} className={cls}>
                        <option value="">Select item...</option>
                        {rawMaterials.map((it: any) => <option key={it.id} value={it.id}>{it.item_name} ({it.item_code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Batch Number</label>
                      <select value={line.batch_number} onChange={e => {
                        const u = [...chargeLines];
                        const b = batches?.find((b: any) => b.batch_number === e.target.value);
                        u[i].batch_number = e.target.value;
                        u[i].grn_id = b?.grn_id || '';
                        if (b && !u[i].item_id) u[i].item_id = b.item_id;
                        setChargeLines(u);
                      }} className={cls}>
                        <option value="">Select batch...</option>
                        {batches?.map((b: any) => <option key={b.batch_number} value={b.batch_number}>{b.batch_number} — {b.item_name} ({fmt(b.total_accepted)} KG)</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Weight Charged (KG)</label>
                    <input type="number" value={line.weight_charged} onChange={e => { const u = [...chargeLines]; u[i].weight_charged = e.target.value; setChargeLines(u); }} className={cls} placeholder="0" />
                  </div>
                </div>
              ))}
              <button onClick={() => setChargeLines([...chargeLines, { item_id: '', batch_number: '', grn_id: '', weight_charged: '' }])}
                className="w-full px-4 py-2 border border-dashed border-brand-primary text-brand-primary rounded-lg text-sm hover:bg-brand-light">
                + Add Batch
              </button>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-700 font-medium">Total from ingots: {fmt(chargeLines.reduce((s, l) => s + (parseFloat(l.weight_charged) || 0), 0))} KG</p>
              </div>
            </div>
          )}
          {step === 'scrap' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Enter return scrap added to this melt.</p>
              {scrapLines.map((line, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-medium text-text-primary">Scrap {i + 1}</p>
                    <button onClick={() => setScrapLines(scrapLines.filter((_, j) => j !== i))} className="text-xs text-red-500">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Scrap Type</label>
                      <select value={line.scrap_type} onChange={e => { const u = [...scrapLines]; u[i].scrap_type = e.target.value; setScrapLines(u); }} className={cls}>
                        <option value="">Select type...</option>
                        {['gates', 'runners', 'rejected_castings', 'flash', 'spillage', 'other'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Weight (KG)</label>
                      <input type="number" value={line.weight_kg} onChange={e => { const u = [...scrapLines]; u[i].weight_kg = e.target.value; setScrapLines(u); }} className={cls} placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Alloy Grade</label>
                      <input value={line.alloy_grade} onChange={e => { const u = [...scrapLines]; u[i].alloy_grade = e.target.value; setScrapLines(u); }} className={cls} placeholder="e.g. ADC12" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Notes</label>
                      <input value={line.notes} onChange={e => { const u = [...scrapLines]; u[i].notes = e.target.value; setScrapLines(u); }} className={cls} placeholder="Optional" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setScrapLines([...scrapLines, { scrap_type: '', weight_kg: '', alloy_grade: '', notes: '' }])}
                className="w-full px-4 py-2 border border-dashed border-amber-400 text-amber-600 rounded-lg text-sm hover:bg-amber-50">
                + Add Scrap Line
              </button>
              {scrapLines.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="text-amber-700 font-medium">Total return scrap: {fmt(scrapLines.reduce((s, l) => s + (parseFloat(l.weight_kg) || 0), 0))} KG</p>
                </div>
              )}
            </div>
          )}
          {mutation.isError && <p className="text-red-500 text-sm">Failed to create melt record</p>}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={handleSubmit} disabled={!form.furnace_id || !form.alloy_grade_id || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create Melt Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UpdateStatusModal: React.FC<{ record: any; onClose: () => void }> = ({ record, onClose }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(record.status);
  const [data, setData] = useState<any>({});
  const statuses = ['charging', 'melting', 'degassing', 'ready', 'transferred', 'closed', 'rejected'];
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/melt/records/${record.id}/status`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meltRecords'] }); queryClient.invalidateQueries({ queryKey: ['meltRecord', record.id] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Update — {record.melt_lot_number}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">New Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={cls}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {status === 'melting' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-text-secondary mb-1">Melting start</label><input type="datetime-local" className={cls} onChange={e => setData({ ...data, melting_start_at: e.target.value })} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Charging end</label><input type="datetime-local" className={cls} onChange={e => setData({ ...data, charging_end_at: e.target.value })} /></div>
            </div>
          )}
          {status === 'degassing' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-text-secondary mb-1">Melt complete temp (°C)</label><input type="number" className={cls} placeholder="700" onChange={e => setData({ ...data, temp_at_melt_complete: parseFloat(e.target.value), melting_end_at: new Date().toISOString(), degassing_start_at: new Date().toISOString() })} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Instrument</label><select className={cls} onChange={e => setData({ ...data, temp_instrument: e.target.value })}><option value="thermocouple">Thermocouple</option><option value="pyrometer">Pyrometer</option></select></div>
            </div>
          )}
          {status === 'ready' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-text-secondary mb-1">Metal ready (KG)</label><input type="number" className={cls} placeholder="0" onChange={e => setData({ ...data, metal_ready_kg: parseFloat(e.target.value), degassing_end_at: new Date().toISOString(), ready_at: new Date().toISOString() })} /></div>
                <div><label className="block text-xs text-text-secondary mb-1">Dross weight (KG)</label><input type="number" className={cls} placeholder="0" onChange={e => setData({ ...data, dross_weight_kg: parseFloat(e.target.value) })} /></div>
              </div>
              <div><label className="block text-xs text-text-secondary mb-1">Temp at degassing end (°C)</label><input type="number" className={cls} placeholder="700" onChange={e => setData({ ...data, temp_at_degassing_end: parseFloat(e.target.value) })} /></div>
            </div>
          )}
          {status === 'transferred' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-text-secondary mb-1">Metal transferred (KG)</label><input type="number" className={cls} placeholder="0" onChange={e => setData({ ...data, metal_transferred_kg: parseFloat(e.target.value), transfer_start_at: new Date().toISOString(), transfer_end_at: new Date().toISOString() })} /></div>
                <div><label className="block text-xs text-text-secondary mb-1">Spillage (KG)</label><input type="number" className={cls} placeholder="0" onChange={e => setData({ ...data, metal_spillage_kg: parseFloat(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-text-secondary mb-1">Transfer temp (°C)</label><input type="number" className={cls} placeholder="700" onChange={e => setData({ ...data, temp_at_transfer: parseFloat(e.target.value) })} /></div>
                <div><label className="block text-xs text-text-secondary mb-1">Transfer to</label><input className={cls} placeholder="e.g. DC-01" onChange={e => setData({ ...data, transfer_to_id: e.target.value, transfer_to_type: 'casting_machine' })} /></div>
              </div>
              <div><label className="block text-xs text-text-secondary mb-1">Ladle number</label><input className={cls} placeholder="e.g. L-01" onChange={e => setData({ ...data, ladle_number: e.target.value })} /></div>
            </div>
          )}
          {status === 'rejected' && (
            <div><label className="block text-sm font-medium text-text-primary mb-1">Rejection reason</label><textarea className={cls} rows={2} onChange={e => setData({ ...data, rejection_reason: e.target.value })} /></div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({ status, ...data })} disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TempLogModal: React.FC<{ record: any; onClose: () => void }> = ({ record, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ stage: 'melt_complete', temperature: '', instrument_type: 'thermocouple', recorded_by: 'Operator', deviation_action: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.post(`/api/melt/records/${record.id}/temperature`, d),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['meltRecord', record.id] });
      if (res.data.is_out_of_spec) alert('⚠ Temperature is OUT OF SPEC for this alloy grade!');
      onClose();
    }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  const stages = ['charging', 'melt_complete', 'degassing_start', 'degassing_end', 'pre_transfer', 'transfer', 'pouring'];
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Log Temperature</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Stage</label>
            <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className={cls}>
              {stages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Temperature (°C)</label>
            <input type="number" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} className={cls} placeholder="e.g. 720" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Instrument</label>
              <select value={form.instrument_type} onChange={e => setForm({ ...form, instrument_type: e.target.value })} className={cls}>
                <option value="thermocouple">Thermocouple</option>
                <option value="pyrometer">Pyrometer</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Recorded By</label>
              <input value={form.recorded_by} onChange={e => setForm({ ...form, recorded_by: e.target.value })} className={cls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Deviation action (if any)</label>
            <input value={form.deviation_action} onChange={e => setForm({ ...form, deviation_action: e.target.value })} className={cls} placeholder="What was done..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.temperature || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Logging...' : 'Log Temperature'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChemistryLogModal: React.FC<{ record: any; onClose: () => void }> = ({ record, onClose }) => {
  const queryClient = useQueryClient();
  const elements = ['si', 'cu', 'fe', 'mn', 'mg', 'ni', 'zn', 'sn', 'ti', 'pb', 'al'];
  const [form, setForm] = useState<any>({ method: 'spectrometer', sample_number: 1, recorded_by: 'QC', corrective_action: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.post(`/api/melt/records/${record.id}/chemistry`, d),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['meltRecord', record.id] });
      if (res.data.status === 'fail') alert('⚠ Chemistry is OUT OF SPEC! Take corrective action.');
      onClose();
    }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Log Chemistry — {record.melt_lot_number}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Method</label>
              <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className={cls}>
                <option value="spectrometer">Spectrometer</option>
                <option value="wet_analysis">Wet analysis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Sample number</label>
              <input type="number" value={form.sample_number} onChange={e => setForm({ ...form, sample_number: parseInt(e.target.value) })} className={cls} min={1} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {elements.map(el => (
              <div key={el}>
                <label className="block text-xs text-text-secondary mb-1 uppercase">{el} %</label>
                <input type="number" step="0.01" value={form[el] || ''} onChange={e => setForm({ ...form, [el]: parseFloat(e.target.value) })} className={cls} placeholder="0.00" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Corrective action</label>
            <input value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} className={cls} placeholder="e.g. Added Al-Si master alloy 2 KG" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Recorded By</label>
            <input value={form.recorded_by} onChange={e => setForm({ ...form, recorded_by: e.target.value })} className={cls} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Logging...' : 'Submit Chemistry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MeltDetailPanel: React.FC<{ record: any; onClose: () => void }> = ({ record, onClose }) => {
  const [showTempModal, setShowTempModal] = useState(false);
  const [showChemModal, setShowChemModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { data: detail } = useQuery({
    queryKey: ['meltRecord', record.id],
    queryFn: () => api.get(`/api/melt/records/${record.id}`).then(r => r.data.data),
    staleTime: 0
  });
  const r = detail || record;
  const holdingTime = r.ready_at && r.transfer_start_at
    ? Math.round((new Date(r.transfer_start_at).getTime() - new Date(r.ready_at).getTime()) / 60000)
    : null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {showTempModal && <TempLogModal record={r} onClose={() => setShowTempModal(false)} />}
        {showChemModal && <ChemistryLogModal record={r} onClose={() => setShowChemModal(false)} />}
        {showStatusModal && <UpdateStatusModal record={r} onClose={() => setShowStatusModal(false)} />}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-text-primary">{r.melt_lot_number}</h2>
            <p className="text-text-secondary text-sm">{r.furnace?.machine_code} | {r.alloy_spec?.item?.item_code} | Shift {r.shift}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={r.status} />
            <button onClick={() => setShowStatusModal(true)} className="text-xs bg-brand-light text-brand-primary px-3 py-1 rounded-lg hover:bg-blue-100 font-medium">Update Status</button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-xs text-text-secondary">Total Charge</p>
              <p className="text-xl font-bold text-text-primary mt-1">{fmt(r.total_charge_weight)} <span className="text-xs font-normal">KG</span></p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-xs text-text-secondary">Metal Transferred</p>
              <p className="text-xl font-bold text-green-600 mt-1">{fmt(r.metal_transferred_kg || 0)} <span className="text-xs font-normal">KG</span></p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-xs text-text-secondary">Dross Loss</p>
              <p className="text-xl font-bold text-red-500 mt-1">{fmt(r.dross_weight_kg || 0)} <span className="text-xs font-normal">KG</span></p>
            </div>
            <div className={`rounded-lg p-3 text-center ${r.yield_percent && r.yield_percent < 95 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-xs text-text-secondary">Yield</p>
              <p className={`text-xl font-bold mt-1 ${r.yield_percent && r.yield_percent < 95 ? 'text-red-500' : 'text-green-600'}`}>{r.yield_percent ? r.yield_percent.toFixed(1) + '%' : '—'}</p>
            </div>
          </div>
          {r.charge_lines?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Charge Lines — Ingots</p>
              <table className="w-full text-sm">
                <thead><tr className="bg-brand-light">
                  <th className="text-left px-3 py-2 text-brand-primary text-xs">Item</th>
                  <th className="text-left px-3 py-2 text-brand-primary text-xs">Batch</th>
                  <th className="text-right px-3 py-2 text-brand-primary text-xs">Weight</th>
                </tr></thead>
                <tbody>
                  {r.charge_lines.map((l: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-xs">{l.item?.item_name}</td>
                      <td className="px-3 py-2 text-xs text-brand-primary">{l.batch_number || '—'}</td>
                      <td className="px-3 py-2 text-xs text-right font-medium">{fmt(l.weight_charged)} KG</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {r.return_scrap_lines?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Return Scrap</p>
              <table className="w-full text-sm">
                <thead><tr className="bg-amber-50">
                  <th className="text-left px-3 py-2 text-amber-700 text-xs">Type</th>
                  <th className="text-left px-3 py-2 text-amber-700 text-xs">Grade</th>
                  <th className="text-right px-3 py-2 text-amber-700 text-xs">Weight</th>
                </tr></thead>
                <tbody>
                  {r.return_scrap_lines.map((l: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-xs capitalize">{l.scrap_type?.replace('_', ' ')}</td>
                      <td className="px-3 py-2 text-xs">{l.alloy_grade || '—'}</td>
                      <td className="px-3 py-2 text-xs text-right font-medium">{fmt(l.weight_kg)} KG</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">Temperature Log</p>
              <button onClick={() => setShowTempModal(true)} className="text-xs bg-brand-light text-brand-primary px-3 py-1 rounded-lg hover:bg-blue-100">+ Log Temp</button>
            </div>
            {r.temp_readings?.length > 0 ? (
              <div className="space-y-2">
                {r.temp_readings.map((t: any, i: number) => (
                  <div key={i} className={`flex justify-between items-center p-2 rounded-lg text-sm ${t.is_out_of_spec ? 'bg-red-50 border border-red-200' : 'bg-surface'}`}>
                    <span className="text-text-secondary text-xs capitalize">{t.stage.replace(/_/g, ' ')}</span>
                    <span className={`font-bold ${t.is_out_of_spec ? 'text-red-500' : 'text-text-primary'}`}>{t.temperature}°C {t.is_out_of_spec ? '⚠ Out of spec' : '✓'}</span>
                    <span className="text-text-secondary text-xs">{t.instrument_type}</span>
                  </div>
                ))}
                {holdingTime !== null && (
                  <div className={`p-2 rounded-lg text-sm ${holdingTime > 30 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50'}`}>
                    <span className="text-text-secondary text-xs">Holding time: </span>
                    <span className={`font-bold ${holdingTime > 30 ? 'text-amber-600' : 'text-green-600'}`}>{holdingTime} min {holdingTime > 30 ? '⚠ Long hold' : '✓'}</span>
                  </div>
                )}
              </div>
            ) : <p className="text-text-secondary text-xs py-2">No temperature readings yet</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">Chemistry Log</p>
              <button onClick={() => setShowChemModal(true)} className="text-xs bg-brand-light text-brand-primary px-3 py-1 rounded-lg hover:bg-blue-100">+ Log Chemistry</button>
            </div>
            {r.chemistry_readings?.length > 0 ? (
              r.chemistry_readings.map((c: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border mb-2 ${c.status === 'fail' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-medium">Sample {c.sample_number} — {c.method}</span>
                    <span className={`text-xs font-bold ${c.status === 'fail' ? 'text-red-600' : 'text-green-600'}`}>{c.status?.toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {['si', 'cu', 'fe', 'mn', 'mg', 'ni', 'zn', 'al'].map(el => c[el] !== null && c[el] !== undefined && (
                      <ChemistryBar key={el} label={el.toUpperCase()} actual={c[el]}
                        min={r.alloy_spec?.[`${el}_min`]} max={r.alloy_spec?.[`${el}_max`]} />
                    ))}
                  </div>
                  {c.corrective_action && <p className="text-xs text-amber-600 mt-1">Action: {c.corrective_action}</p>}
                </div>
              ))
            ) : <p className="text-text-secondary text-xs py-2">No chemistry readings yet</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-text-primary mb-2">Process Details</p>
              <p className="text-xs"><span className="text-text-secondary">Degassing:</span> {r.degassing_method} / {r.degassing_medium} — {r.degassing_duration_min ? r.degassing_duration_min + ' min' : '—'}</p>
              <p className="text-xs"><span className="text-text-secondary">Flux:</span> {r.flux_type || '—'} {r.flux_quantity_kg ? '— ' + r.flux_quantity_kg + ' KG' : ''}</p>
              <p className="text-xs"><span className="text-text-secondary">Lining:</span> {r.lining_condition || '—'}</p>
              <p className="text-xs"><span className="text-text-secondary">Operator:</span> {r.operator_id || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-text-primary mb-2">Transfer Details</p>
              <p className="text-xs"><span className="text-text-secondary">Transfer to:</span> {r.transfer_to_id || '—'}</p>
              <p className="text-xs"><span className="text-text-secondary">Ladle:</span> {r.ladle_number || '—'}</p>
              <p className="text-xs"><span className="text-text-secondary">Spillage:</span> {r.metal_spillage_kg ? r.metal_spillage_kg + ' KG' : '—'}</p>
              <p className="text-xs"><span className="text-text-secondary">Ambient:</span> {r.ambient_temp_c ? r.ambient_temp_c + '°C' : '—'} / {r.ambient_humidity_pct ? r.ambient_humidity_pct + '%' : '—'} RH</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FurnacesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ furnace_number: '', furnace_name: '', furnace_type: 'melting', fuel_type: 'gas', capacity_kg: '', lining_material: '', lining_life_kg: '' });
  const { data: furnaces } = useQuery({ queryKey: ['furnaces'], queryFn: () => api.get('/api/melt/furnaces').then(r => r.data.data) });
  const { data: mwosData } = useQuery({ queryKey: ['mwos', 'released'], queryFn: () => api.get('/api/mwo?status=released').then(r => r.data.data) });
  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/melt/furnaces', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['furnaces'] }); setShowAdd(false); setForm({ furnace_number: '', furnace_name: '', furnace_type: 'melting', fuel_type: 'gas', capacity_kg: '', lining_material: '', lining_life_kg: '' }); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-text-primary">Furnace Master</p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">+ Add Furnace</button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-3 border border-brand-primary">
          <p className="font-medium text-text-primary text-sm">New Furnace</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-secondary mb-1">Furnace Number</label><input value={form.furnace_number} onChange={e => setForm({ ...form, furnace_number: e.target.value.toUpperCase() })} className={cls} placeholder="e.g. F-01" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Furnace Name</label><input value={form.furnace_name} onChange={e => setForm({ ...form, furnace_name: e.target.value })} className={cls} placeholder="e.g. Main Melting Furnace" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Type</label>
              <select value={form.furnace_type} onChange={e => setForm({ ...form, furnace_type: e.target.value })} className={cls}>
                {['melting', 'holding', 'combined', 'crucible'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-text-secondary mb-1">Fuel Type</label>
              <select value={form.fuel_type} onChange={e => setForm({ ...form, fuel_type: e.target.value })} className={cls}>
                {['gas', 'electric', 'oil', 'induction'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-text-secondary mb-1">Capacity (KG)</label><input type="number" value={form.capacity_kg} onChange={e => setForm({ ...form, capacity_kg: e.target.value })} className={cls} placeholder="500" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Lining Material</label><input value={form.lining_material} onChange={e => setForm({ ...form, lining_material: e.target.value })} className={cls} placeholder="e.g. silica" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Lining Life (KG melted)</label><input type="number" value={form.lining_life_kg} onChange={e => setForm({ ...form, lining_life_kg: e.target.value })} className={cls} placeholder="500000" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({ ...form, capacity_kg: form.capacity_kg ? parseFloat(form.capacity_kg) : null, lining_life_kg: form.lining_life_kg ? parseFloat(form.lining_life_kg) : null })}
              disabled={!form.furnace_number || !form.furnace_name || mutation.isPending}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Furnace'}
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-brand-light">
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Furnace</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Fuel</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Capacity</th>
            <th className="text-right px-4 py-3 text-brand-primary font-medium">Total Melted</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Lining</th>
            <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
          </tr></thead>
          <tbody>
            {furnaces?.map((f: any, i: number) => {
              const liningUsed = f.lining_life_kg ? (f.total_kg_melted / f.lining_life_kg) * 100 : null;
              return (
                <tr key={f.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3"><p className="font-medium text-text-primary">{f.machine_code}</p><p className="text-text-secondary text-xs">{f.machine_name}</p></td>
                  <td className="px-4 py-3 text-text-secondary text-xs capitalize">{f.furnace_type}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs capitalize">{f.fuel_type}</td>
                  <td className="px-4 py-3 text-right text-xs">{f.capacity_kg ? fmt(f.capacity_kg) + ' KG' : '—'}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium">{fmt(f.total_kg_melted)} KG</td>
                  <td className="px-4 py-3 text-xs">
                    {liningUsed !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${liningUsed > 80 ? 'bg-red-500' : liningUsed > 60 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(liningUsed, 100)}%` }}></div>
                        </div>
                        <span className={`text-xs ${liningUsed > 80 ? 'text-red-500' : 'text-text-secondary'}`}>{liningUsed.toFixed(0)}%</span>
                      </div>
                    ) : f.lining_material || '—'}
                  </td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{f.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {furnaces?.length === 0 && <div className="text-center py-12 text-text-secondary">No furnaces defined. Add your first furnace above.</div>}
      </div>
    </div>
  );
};

const AlloyGradesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ item_id: '', standard: '', alloy_system: 'Al-Si', melt_temp_min: '', melt_temp_max: '', transfer_temp_min: '', transfer_temp_max: '', pouring_temp_min: '', pouring_temp_max: '' });
  const elements = ['si', 'cu', 'fe', 'mn', 'mg', 'ni', 'zn', 'sn', 'ti', 'pb'];
  const { data: grades } = useQuery({ queryKey: ['alloyGrades'], queryFn: () => api.get('/api/melt/alloy-grades').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const rawMaterials = items?.filter((i: any) => i.item_type === 'raw_material') || [];
  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/melt/alloy-grades', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alloyGrades'] }); setShowAdd(false); }
  });
  const cls = "w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary";
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-text-primary">Alloy Grade Master</p>
        <button onClick={() => setShowAdd(!showAdd)} className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">+ Add Grade</button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-brand-primary">
          <p className="font-medium text-text-primary text-sm">New Alloy Grade</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Raw Material Item <span className="text-red-500">*</span></label><select value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} className={cls}><option value="">Select item...</option>{rawMaterials.map((i: any) => <option key={i.id} value={i.id}>{i.item_code} — {i.item_name}</option>)}</select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Standard</label><input value={form.standard} onChange={e => setForm({ ...form, standard: e.target.value })} className={cls} placeholder="JIS H5302" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Alloy System</label>
              <select value={form.alloy_system} onChange={e => setForm({ ...form, alloy_system: e.target.value })} className={cls}>
                {['Al-Si', 'Al-Cu', 'Al-Mg', 'Al-Zn', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-2">Chemistry Spec (% by weight) — enter min and max</p>
            <div className="grid grid-cols-5 gap-2">
              {elements.map(el => (
                <div key={el} className="space-y-1">
                  <p className="text-xs text-text-secondary uppercase font-medium text-center">{el}</p>
                  <input type="number" step="0.01" className={cls} placeholder="min" onChange={e => setForm({ ...form, [`${el}_min`]: parseFloat(e.target.value) })} />
                  <input type="number" step="0.01" className={cls} placeholder="max" onChange={e => setForm({ ...form, [`${el}_max`]: parseFloat(e.target.value) })} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-2">Temperature Spec (°C)</p>
            <div className="grid grid-cols-3 gap-3">
              {[['melt_temp', 'Melt Temp'], ['transfer_temp', 'Transfer Temp'], ['pouring_temp', 'Pouring Temp']].map(([key, label]) => (
                <div key={key}>
                  <p className="text-xs text-text-secondary mb-1">{label}</p>
                  <div className="flex gap-1">
                    <input type="number" className={cls} placeholder="min" onChange={e => setForm({ ...form, [`${key}_min`]: parseFloat(e.target.value) })} />
                    <input type="number" className={cls} placeholder="max" onChange={e => setForm({ ...form, [`${key}_max`]: parseFloat(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.item_id || mutation.isPending}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Grade'}
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-brand-light">
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Grade</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Standard</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">System</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Melt Temp</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Transfer Temp</th>
            <th className="text-left px-4 py-3 text-brand-primary font-medium">Key Elements</th>
          </tr></thead>
          <tbody>
            {grades?.map((g: any, i: number) => (
              <tr key={g.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                <td className="px-4 py-3"><p className="font-medium text-text-primary">{g.item?.item_code}</p><p className="text-text-secondary text-xs">{g.item?.item_name}</p></td>
                <td className="px-4 py-3 text-xs text-text-secondary">{g.standard || '—'}</td>
                <td className="px-4 py-3 text-xs text-text-secondary">{g.alloy_system || '—'}</td>
                <td className="px-4 py-3 text-xs">{g.melt_temp_min && g.melt_temp_max ? `${g.melt_temp_min}–${g.melt_temp_max}°C` : '—'}</td>
                <td className="px-4 py-3 text-xs">{g.transfer_temp_min && g.transfer_temp_max ? `${g.transfer_temp_min}–${g.transfer_temp_max}°C` : '—'}</td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {['si', 'cu', 'fe'].filter(el => g[`${el}_max`]).map(el => `${el.toUpperCase()} ≤${g[`${el}_max`]}`).join(' | ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {grades?.length === 0 && <div className="text-center py-12 text-text-secondary">No alloy grades defined. Add your first grade above.</div>}
      </div>
    </div>
  );
};


// ── Melt Work Order Tab ───────────────────────────────────
const MWOTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMWO, setSelectedMWO] = useState<any>(null);
  const [form, setForm] = useState<any>({ furnace_id: '', alloy_spec_id: '', planned_charge_weight: '', planned_fresh_ingot: '', planned_return_scrap: '', shift: 'A', planned_date: new Date().toISOString().slice(0,16), notes: '' });

  const { data: mwos, isLoading } = useQuery({ queryKey: ['mwos'], queryFn: () => api.get('/api/mwo').then(r => r.data.data), staleTime: 0 });
  const { data: furnaces } = useQuery({ queryKey: ['furnaces'], queryFn: () => api.get('/api/melt/furnaces').then(r => r.data.data) });
  const { data: mwosData } = useQuery({ queryKey: ['mwos', 'released'], queryFn: () => api.get('/api/mwo?status=released').then(r => r.data.data) });
  const { data: alloySpecs } = useQuery({ queryKey: ['alloyGrades'], queryFn: () => api.get('/api/melt/alloy-grades').then(r => r.data.data) });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/api/mwo', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mwos'] }); setShowCreate(false); setForm({ furnace_id: '', alloy_spec_id: '', planned_charge_weight: '', planned_fresh_ingot: '', planned_return_scrap: '', shift: 'A', planned_date: new Date().toISOString().slice(0,16), notes: '' }); }
  });

  const releaseMutation = useMutation({
    mutationFn: ({ id, released_by }: any) => api.put(`/api/mwo/${id}/status`, { status: 'released', released_by }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mwos'] })
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/mwo/${id}/status`, { status: 'cancelled' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mwos'] })
  });

  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";

  const statusColors: any = {
    planned: 'bg-blue-50 text-blue-600 border-blue-200',
    released: 'bg-green-50 text-green-600 border-green-200',
    in_progress: 'bg-purple-50 text-purple-600 border-purple-200',
    completed: 'bg-gray-50 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-400 border-red-200'
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-text-primary">Melt Work Orders</p>
        <button onClick={() => setShowCreate(!showCreate)} className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">+ New MWO</button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-brand-primary">
          <p className="font-medium text-text-primary text-sm">New Melt Work Order</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Furnace <span className="text-red-500">*</span></label>
              <select value={form.furnace_id} onChange={e => setForm({ ...form, furnace_id: e.target.value })} className={cls}>
                <option value="">Select furnace...</option>
                {furnaces?.map((f: any) => <option key={f.id} value={f.id}>{f.machine_code} — {f.machine_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Alloy Spec</label>
              <select value={form.alloy_spec_id} onChange={e => setForm({ ...form, alloy_spec_id: e.target.value })} className={cls}>
                <option value="">Select alloy...</option>
                {alloySpecs?.map((g: any) => <option key={g.id} value={g.id}>{g.item?.item_code} — {g.item?.item_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Planned Charge Weight (KG) <span className="text-red-500">*</span></label>
              <input type="number" value={form.planned_charge_weight} onChange={e => setForm({ ...form, planned_charge_weight: e.target.value })} className={cls} placeholder="e.g. 500" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Fresh Ingot (KG)</label>
              <input type="number" value={form.planned_fresh_ingot} onChange={e => setForm({ ...form, planned_fresh_ingot: e.target.value })} className={cls} placeholder="e.g. 400" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Return Scrap (KG)</label>
              <input type="number" value={form.planned_return_scrap} onChange={e => setForm({ ...form, planned_return_scrap: e.target.value })} className={cls} placeholder="e.g. 100" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Shift</label>
              <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} className={cls}>
                {['A', 'B', 'C', 'Day', 'Night'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Planned Date</label>
              <input type="datetime-local" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} className={cls} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={cls} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => createMutation.mutate(form)} disabled={!form.furnace_id || !form.planned_charge_weight || createMutation.isPending}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create MWO'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-brand-primary animate-pulse">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-brand-light">
              <th className="text-left px-4 py-3 text-brand-primary font-medium">MWO No</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Date / Shift</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Furnace</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Alloy</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Planned (KG)</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Issued (KG)</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {mwos?.map((m: any, i: number) => {
                const totalIssued = m.material_issues?.reduce((s: number, mi: any) => s + (mi.issued_qty || 0), 0) || 0;
                return (
                  <tr key={m.id} onClick={() => setSelectedMWO(m)} className={`border-t border-border hover:bg-brand-light cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3 font-medium text-brand-primary">{m.mwo_number}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {new Date(m.planned_date).toLocaleDateString('en-IN')}<br />Shift {m.shift}
                    </td>
                    <td className="px-4 py-3 text-xs">{m.furnace?.machine_code}</td>
                    <td className="px-4 py-3 text-xs font-medium">{m.alloy_spec?.item?.item_code || '—'}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <p>{fmt(m.planned_charge_weight)} KG</p>
                      <p className="text-text-secondary">Fresh: {fmt(m.planned_fresh_ingot || 0)}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {totalIssued > 0 ? (
                        <span className="font-medium text-green-600">{fmt(totalIssued)} KG</span>
                      ) : <span className="text-text-secondary">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[m.status] || 'bg-gray-50 text-gray-500'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {m.status === 'planned' && (
                          <button onClick={() => releaseMutation.mutate({ id: m.id, released_by: 'Supervisor' })}
                            className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 border border-green-200">
                            Release
                          </button>
                        )}
                        {m.status === 'planned' && (
                          <button onClick={() => cancelMutation.mutate(m.id)}
                            className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-200">
                            Cancel
                          </button>
                        )}
                        {m.melt_records?.length > 0 && (
                          <span className="text-xs text-text-secondary">{m.melt_records.length} melt{m.melt_records.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!mwos || mwos.length === 0) && <div className="text-center py-12 text-text-secondary">No melt work orders yet</div>}
        </div>
      )}
    {selectedMWO && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-text-primary">{selectedMWO.mwo_number}</h2>
                <p className="text-text-secondary text-sm">{selectedMWO.furnace?.machine_code} — {selectedMWO.furnace?.machine_name} | Shift {selectedMWO.shift}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[selectedMWO.status] || 'bg-gray-50 text-gray-500'}`}>{selectedMWO.status}</span>
                <button onClick={() => setSelectedMWO(null)} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface rounded-lg p-3 text-center">
                  <p className="text-xs text-text-secondary">Planned Charge</p>
                  <p className="text-xl font-bold text-text-primary mt-1">{fmt(selectedMWO.planned_charge_weight)} <span className="text-xs font-normal">KG</span></p>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center">
                  <p className="text-xs text-text-secondary">Fresh Ingot</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{fmt(selectedMWO.planned_fresh_ingot || 0)} <span className="text-xs font-normal">KG</span></p>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center">
                  <p className="text-xs text-text-secondary">Return Scrap</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{fmt(selectedMWO.planned_return_scrap || 0)} <span className="text-xs font-normal">KG</span></p>
                </div>
              </div>

              {/* Alloy Spec */}
              {selectedMWO.alloy_spec && (
                <div>
                  <p className="text-sm font-medium text-text-primary mb-2">Alloy Specification — {selectedMWO.alloy_spec.item?.item_code}</p>
                  <div className="bg-surface rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <p><span className="text-text-secondary">Standard:</span> {selectedMWO.alloy_spec.standard || '—'}</p>
                      <p><span className="text-text-secondary">System:</span> {selectedMWO.alloy_spec.alloy_system || '—'}</p>
                      <p><span className="text-text-secondary">Melt Temp:</span> {selectedMWO.alloy_spec.melt_temp_min}–{selectedMWO.alloy_spec.melt_temp_max}°C</p>
                      <p><span className="text-text-secondary">Transfer Temp:</span> {selectedMWO.alloy_spec.transfer_temp_min}–{selectedMWO.alloy_spec.transfer_temp_max}°C</p>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs border-t border-border pt-2">
                      {['si','cu','fe','mn','mg','ni','zn','sn','ti','pb'].filter(el => selectedMWO.alloy_spec[`${el}_max`] || selectedMWO.alloy_spec[`${el}_min`]).map(el => (
                        <div key={el} className="text-center">
                          <p className="text-text-secondary uppercase font-medium">{el}</p>
                          <p className="font-bold text-text-primary">{selectedMWO.alloy_spec[`${el}_min`] || '—'} – {selectedMWO.alloy_spec[`${el}_max`] || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Issued Material */}
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Material Issued</p>
                {selectedMWO.material_issues?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="bg-brand-light">
                      <th className="text-left px-3 py-2 text-brand-primary text-xs">Batch</th>
                      <th className="text-left px-3 py-2 text-brand-primary text-xs">From Location</th>
                      <th className="text-right px-3 py-2 text-brand-primary text-xs">Issued KG</th>
                    </tr></thead>
                    <tbody>
                      {selectedMWO.material_issues.map((mi: any, i: number) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 text-xs font-medium text-brand-primary">{mi.batch_number || '—'}</td>
                          <td className="px-3 py-2 text-xs text-text-secondary">{mi.location || '—'}</td>
                          <td className="px-3 py-2 text-xs text-right font-medium">{fmt(mi.issued_qty)} KG</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-text-secondary text-xs">No material issued yet. Issue material from Stores → Issue Material → Melting.</p>}
              </div>

              {/* Linked Melt Records */}
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Melt Records</p>
                {selectedMWO.melt_records?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMWO.melt_records.map((mr: any) => (
                      <div key={mr.id} className="flex justify-between items-center bg-surface rounded-lg p-3 text-sm">
                        <span className="font-medium text-brand-primary">{mr.melt_lot_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${mr.status === 'transferred' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{mr.status}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-text-secondary text-xs">No melt records created yet.</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-border pt-4">
                {selectedMWO.status === 'planned' && (
                  <button onClick={() => { releaseMutation.mutate({ id: selectedMWO.id, released_by: 'Supervisor' }); setSelectedMWO({ ...selectedMWO, status: 'released' }); }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    Release MWO
                  </button>
                )}
                <button onClick={() => setSelectedMWO(null)} className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Melting: React.FC = () => {
  const [activeTab, setActiveTab] = useState('records');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFurnace, setFilterFurnace] = useState('');

  const { data: mwos } = useQuery({ queryKey: ['mwos'], queryFn: () => api.get('/api/mwo').then(r => r.data.data), staleTime: 0 });
  const pendingMWOs = mwos?.filter((m: any) => m.status === 'released').length || 0;
  const { data: records, isLoading } = useQuery({
    queryKey: ['meltRecords', filterStatus, filterFurnace],
    queryFn: () => {
      const q = [filterStatus ? `status=${filterStatus}` : '', filterFurnace ? `furnace_id=${filterFurnace}` : ''].filter(Boolean).join('&');
      return api.get(`/api/melt/records${q ? '?' + q : ''}`).then(r => r.data.data);
    },
    staleTime: 0
  });

  const { data: furnaces } = useQuery({ queryKey: ['furnaces'], queryFn: () => api.get('/api/melt/furnaces').then(r => r.data.data) });
  const { data: mwosData } = useQuery({ queryKey: ['mwos', 'released'], queryFn: () => api.get('/api/mwo?status=released').then(r => r.data.data) });
  const active = records?.filter((r: any) => !['closed', 'rejected'].includes(r.status)) || [];
  const totalMetal = records?.filter((r: any) => r.status === 'transferred').reduce((s: number, r: any) => s + (r.metal_transferred_kg || 0), 0) || 0;
  const yieldRecords = records?.filter((r: any) => r.yield_percent) || [];
  const avgYield = yieldRecords.length > 0 ? yieldRecords.reduce((s: number, r: any) => s + r.yield_percent, 0) / yieldRecords.length : null;

  return (
    <div className="space-y-6">
      {showCreateModal && <CreateMeltModal onClose={() => setShowCreateModal(false)} />}
      {selectedRecord && <MeltDetailPanel record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Melting</h1>
          <p className="text-text-secondary text-sm mt-1">Melt charge records, chemistry and temperature logs</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          + New Melt Charge
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase">Active Melts</p>
          <p className="text-3xl font-bold mt-1">{active.length}</p>
          <p className="text-blue-200 text-xs mt-1">In progress</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase">Metal Transferred</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalMetal)} KG</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase">Avg Yield</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{avgYield ? avgYield.toFixed(1) + '%' : '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-text-secondary text-xs uppercase">Total Records</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{records?.length || 0}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {[{id:'mwo',label:`Work Orders${pendingMWOs > 0 ? ' ('+pendingMWOs+')':''}`},{id:'records',label:'Melt Records'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-brand-primary text-white' : 'bg-white text-text-secondary hover:bg-surface border border-border'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'mwo' && <MWOTab />}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm flex gap-3">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
              <option value="">All Status</option>
              {['charging', 'melting', 'degassing', 'ready', 'transferred', 'closed', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterFurnace} onChange={e => setFilterFurnace(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
              <option value="">All Furnaces</option>
              {furnaces?.map((f: any) => <option key={f.id} value={f.id}>{f.machine_code}</option>)}
            </select>
            {(filterStatus || filterFurnace) && <button onClick={() => { setFilterStatus(''); setFilterFurnace(''); }} className="text-xs text-brand-primary hover:text-brand-dark">Clear</button>}
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-brand-primary animate-pulse">Loading melt records...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-light">
                    <th className="text-left px-4 py-3 text-brand-primary font-medium">Melt Lot</th>
                    <th className="text-left px-4 py-3 text-brand-primary font-medium">Date / Shift</th>
                    <th className="text-left px-4 py-3 text-brand-primary font-medium">Furnace</th>
                    <th className="text-left px-4 py-3 text-brand-primary font-medium">Grade</th>
                    <th className="text-right px-4 py-3 text-brand-primary font-medium">Charge</th>
                    <th className="text-right px-4 py-3 text-brand-primary font-medium">Transferred</th>
                    <th className="text-right px-4 py-3 text-brand-primary font-medium">Yield</th>
                    <th className="text-center px-4 py-3 text-brand-primary font-medium">Chem</th>
                    <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records?.map((r: any, i: number) => (
                    <tr key={r.id} onClick={() => setSelectedRecord(r)}
                      className={`border-t border-border hover:bg-brand-light cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                      <td className="px-4 py-3 font-medium text-brand-primary">{r.melt_lot_number}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{new Date(r.charge_date).toLocaleDateString('en-IN')}<br />{r.shift && `Shift ${r.shift}`}</td>
                      <td className="px-4 py-3 text-xs">{r.furnace?.machine_code}</td>
                      <td className="px-4 py-3 text-xs font-medium">{r.alloy_spec?.item?.item_code}</td>
                      <td className="px-4 py-3 text-right text-xs">{fmt(r.total_charge_weight)} KG</td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-green-600">{r.metal_transferred_kg ? fmt(r.metal_transferred_kg) + ' KG' : '—'}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        {r.yield_percent ? <span className={r.yield_percent < 95 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>{r.yield_percent.toFixed(1)}%</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.chemistry_checked ? <span className={`px-2 py-0.5 rounded-full text-xs ${r.chemistry_status === 'pass' ? 'bg-green-50 text-green-600' : r.chemistry_status === 'fail' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{r.chemistry_status}</span> : <span className="text-text-secondary text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records?.length === 0 && <div className="text-center py-12 text-text-secondary">No melt records found</div>}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Melting;
