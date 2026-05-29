import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { printIssueSlip } from '../../utils/issue.slip.pdf';

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';

const overrideReasons = [
  'Quality hold on older batch',
  'Physical inaccessibility — batch at back of rack',
  'Customer specification requires specific batch',
  'Older batch under quarantine',
  'Other'
];

const FifoIssueModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [purpose, setPurpose] = useState<'production' | 'melting' | ''>('');
  const [step, setStep] = useState<'purpose' | 'form' | 'split' | 'success'>('purpose');
  const [form, setForm] = useState({
    job_id: '', mwo_id: '', item_id: '',
    planned_qty: '', issued_qty: '',
    issued_by: 'Storekeeper', to_location: ''
  });
  const [splitLines, setSplitLines] = useState<any[]>([]);
  const [lastIssue, setLastIssue] = useState<any>(null);
  const [overrideReasonMap, setOverrideReasonMap] = useState<Record<string, string>>({});
  const [pendingOverrideMap, setPendingOverrideMap] = useState<Record<string, any>>({});

  const { data: jobs } = useQuery({ queryKey: ['jobcards'], queryFn: () => api.get('/api/jobcards').then(r => r.data.data) });
  const { data: mwos } = useQuery({
    queryKey: ['mwos', 'released'],
    queryFn: () => api.get('/api/mwo?status=released').then(r => r.data.data),
    enabled: purpose === 'melting'
  });
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.get('/api/locations').then(r => r.data.data), staleTime: 0 });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });

  const shopFloorLocations = (locations || []).filter((l: any) => l.type === 'shop_floor');

  const selectedMWO = mwos?.find((m: any) => m.id === form.mwo_id);

  // Auto-fill from MWO
  useEffect(() => {
    if (selectedMWO) {
      setForm(f => ({
        ...f,
        item_id: selectedMWO.alloy_spec?.item?.id || '',
        planned_qty: String(selectedMWO.planned_fresh_ingot || selectedMWO.planned_charge_weight || ''),
        issued_qty: String(selectedMWO.planned_fresh_ingot || selectedMWO.planned_charge_weight || ''),
        to_location: selectedMWO.furnace?.machine_code || ''
      }));
    }
  }, [selectedMWO]);

  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ['availableBatches', form.item_id],
    queryFn: () => api.get(`/api/stock/available-batches?item_id=${form.item_id}`).then(r => r.data.data),
    enabled: !!form.item_id && step === 'split'
  });

  const batches: any[] = batchData || [];
  const totalAvailable = batches.reduce((s: number, b: any) => s + b.remaining_qty, 0);

  const calculateFifoSplit = (issuedQty: number, availBatches: any[]) => {
    let remaining = issuedQty;
    const lines: any[] = [];
    for (const batch of availBatches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.remaining_qty);
      lines.push({ ...batch, qty: take, fifo_override: false, override_reason: null, override_request_id: null });
      remaining -= take;
    }
    return lines;
  };

  useEffect(() => {
    if (batches.length > 0 && step === 'split') {
      setSplitLines(calculateFifoSplit(parseFloat(form.issued_qty), batches));
    }
  }, [batches.length, step]);

  const issueMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/stock/issue', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['mwos'] });
      setLastIssue(res.data.data);
      setStep('success');
    },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to issue')
  });

  const overrideMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/stock/fifo-override-request', data),
    onSuccess: (res: any, variables: any) => {
      setPendingOverrideMap(prev => ({ ...prev, [variables.requested_grn_id]: res.data.data }));
    }
  });

  const totalSplit = splitLines.reduce((s, l) => s + (parseFloat(l.qty) || 0), 0);
  const splitValid = Math.abs(totalSplit - parseFloat(form.issued_qty)) < 0.001;

  const needsOverride = (line: any, idx: number) => {
    if (idx === 0) return false;
    return splitLines.slice(0, idx).some((older: any) => older.remaining_qty > 0 && (parseFloat(older.qty) || 0) === 0);
  };

  const handleIssue = () => {
    const lines = splitLines.map((l, i) => ({
      batch_number: l.batch_number,
      grn_id: l.grn_id,
      qty: l.qty,
      fifo_override: needsOverride(l, i),
      override_reason: overrideReasonMap[l.grn_id] || null,
      override_request_id: pendingOverrideMap[l.grn_id]?.id || null
    }));
    issueMutation.mutate({
      job_id: purpose === 'production' ? form.job_id : null,
      mwo_id: purpose === 'melting' ? form.mwo_id : null,
      item_id: form.item_id,
      planned_qty: parseFloat(form.planned_qty),
      issued_qty: parseFloat(form.issued_qty),
      issued_by: form.issued_by,
      to_location: form.to_location || null,
      lines
    });
  };

  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Issue Material</h2>
            <p className="text-text-secondary text-sm">
              {step === 'purpose' && 'Select issue purpose'}
              {step === 'form' && (purpose === 'melting' ? 'Issue for melting' : 'Issue for production')}
              {step === 'split' && 'Review FIFO split'}
              {step === 'success' && 'Material issued successfully'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>

        {/* Step 0 — Purpose */}
        {step === 'purpose' && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-text-secondary">What is this material being issued for?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setPurpose('production'); setStep('form'); }}
                className="border-2 border-border rounded-xl p-5 text-left hover:border-brand-primary hover:bg-brand-light transition-colors">
                <p className="text-2xl mb-2">⚙️</p>
                <p className="font-bold text-text-primary">Production</p>
                <p className="text-text-secondary text-xs mt-1">Issue against a Job Card for a specific part</p>
              </button>
              <button onClick={() => { setPurpose('melting'); setStep('form'); }}
                className="border-2 border-border rounded-xl p-5 text-left hover:border-amber-400 hover:bg-amber-50 transition-colors">
                <p className="text-2xl mb-2">🔥</p>
                <p className="font-bold text-text-primary">Melting</p>
                <p className="text-text-secondary text-xs mt-1">Issue ingots against a Melt Work Order</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Form */}
        {step === 'form' && (
          <div className="p-5 space-y-4">
            {/* Purpose badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${purpose === 'melting' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
              {purpose === 'melting' ? '🔥 Melting Issue' : '⚙️ Production Issue'}
              <button onClick={() => { setPurpose(''); setStep('purpose'); setForm({ job_id: '', mwo_id: '', item_id: '', planned_qty: '', issued_qty: '', issued_by: 'Storekeeper', to_location: '' }); }} className="ml-1 hover:opacity-70">✕</button>
            </div>

            {purpose === 'production' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Job Card <span className="text-red-500">*</span></label>
                <select value={form.job_id} onChange={e => setForm({ ...form, job_id: e.target.value })} className={cls} required>
                  <option value="">Select job...</option>
                  {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.job_number}</option>)}
                </select>
              </div>
            )}

            {purpose === 'melting' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Melt Work Order <span className="text-red-500">*</span></label>
                <select value={form.mwo_id} onChange={e => setForm({ ...form, mwo_id: e.target.value })} className={cls} required>
                  <option value="">Select MWO...</option>
                  {mwos?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.mwo_number} — {m.furnace?.machine_code} — {m.alloy_spec?.item?.item_code} — {fmt(m.planned_charge_weight)} KG
                    </option>
                  ))}
                </select>
                {mwos?.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ No released Melt Work Orders. Ask supervisor to release a MWO first.</p>
                )}
                {selectedMWO && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                    <p className="text-amber-700 font-medium">{selectedMWO.mwo_number}</p>
                    <p className="text-amber-600">Furnace: {selectedMWO.furnace?.machine_code} — {selectedMWO.furnace?.machine_name}</p>
                    <p className="text-amber-600">Alloy: {selectedMWO.alloy_spec?.item?.item_code} — {selectedMWO.alloy_spec?.item?.item_name}</p>
                    <p className="text-amber-600">Planned charge: {fmt(selectedMWO.planned_charge_weight)} KG (Fresh: {fmt(selectedMWO.planned_fresh_ingot)} KG)</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Material <span className="text-red-500">*</span></label>
              <select value={form.item_id} onChange={e => { setForm({ ...form, item_id: e.target.value }); setSplitLines([]); }}
                className={cls} required disabled={purpose === 'melting' && !!selectedMWO}>
                <option value="">Select item...</option>
                {items?.filter((i: any) => i.item_type === 'raw_material' || i.item_type === 'consumable')
                  .map((i: any) => <option key={i.id} value={i.id}>{i.item_name} ({i.item_code})</option>)}
              </select>
              {purpose === 'melting' && selectedMWO && <p className="text-xs text-text-secondary mt-0.5">Auto-filled from MWO alloy spec</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Planned Qty</label>
                <input type="number" value={form.planned_qty} onChange={e => setForm({ ...form, planned_qty: e.target.value })} className={cls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Issued Qty</label>
                <input type="number" value={form.issued_qty} onChange={e => setForm({ ...form, issued_qty: e.target.value })} className={cls} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {purpose === 'melting' ? 'Issue To (Furnace)' : 'Issue To (Shop Floor Location)'}
              </label>
              <select value={form.to_location} onChange={e => setForm({ ...form, to_location: e.target.value })} className={cls}
                disabled={purpose === 'melting' && !!selectedMWO}>
                <option value="">Select location...</option>
                {shopFloorLocations.map((l: any) => (
                  <option key={l.id} value={l.code}>{l.code} {l.description ? `— ${l.description}` : ''}</option>
                ))}
              </select>
              {purpose === 'melting' && selectedMWO && <p className="text-xs text-text-secondary mt-0.5">Auto-filled from MWO furnace</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Issued By</label>
              <input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })} className={cls} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setStep('purpose'); setPurpose(''); }} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">← Back</button>
              <button onClick={() => setStep('split')}
                disabled={!form.item_id || !form.issued_qty || (purpose === 'production' && !form.job_id) || (purpose === 'melting' && !form.mwo_id)}
                className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                Next → Review Split
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — FIFO Split */}
        {step === 'split' && (
          <div className="p-5 space-y-4">
            {batchLoading ? (
              <div className="text-center py-8 text-brand-primary animate-pulse">Calculating FIFO split...</div>
            ) : batches.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <p className="font-medium">⚠ No stock available</p>
                  <p className="text-xs mt-1">There are no batches in stock for this item. Raise a Purchase Order and receive material first before issuing.</p>
                </div>
                <button onClick={() => setStep('form')} className="w-full px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">← Go Back</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-surface rounded-lg p-2">
                    <p className="text-xs text-text-secondary">Required</p>
                    <p className="font-bold text-text-primary">{fmt(parseFloat(form.issued_qty))}</p>
                  </div>
                  <div className="bg-surface rounded-lg p-2">
                    <p className="text-xs text-text-secondary">Available</p>
                    <p className={`font-bold ${totalAvailable >= parseFloat(form.issued_qty) ? 'text-green-600' : 'text-red-500'}`}>{fmt(totalAvailable)}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${splitValid ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-text-secondary">Split Total</p>
                    <p className={`font-bold ${splitValid ? 'text-green-600' : 'text-red-500'}`}>{fmt(totalSplit)}</p>
                  </div>
                </div>

                {purpose === 'melting' && selectedMWO && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    <p className="font-medium">🔥 Issuing for {selectedMWO.mwo_number} → {selectedMWO.furnace?.machine_code}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                  <p className="font-medium">⚡ Auto FIFO Split — {splitLines.length} batch{splitLines.length > 1 ? 'es' : ''}</p>
                </div>

                <div className="space-y-3">
                  {splitLines.map((line, i) => {
                    const isOverride = needsOverride(line, i);
                    const hasPendingOverride = !!pendingOverrideMap[line.grn_id];
                    return (
                      <div key={line.grn_id} className={`p-3 rounded-xl border ${isOverride ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="font-medium text-sm">{line.batch_number}</p>
                            <p className="text-xs text-text-secondary">{line.grn_number} | {new Date(line.received_date).toLocaleDateString('en-IN')}</p>
                            {line.location && <p className="text-xs text-blue-600 mt-0.5">📍 Pick from: {line.location}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isOverride && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">⚡ FIFO</span>}
                            {isOverride && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Override</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-text-secondary w-16">Qty:</label>
                          <input type="number" value={line.qty} readOnly
                            className="flex-1 px-2 py-1 border border-border rounded text-sm bg-surface cursor-not-allowed" />
                          <span className="text-xs text-text-secondary">/ {fmt(line.remaining_qty)} avail</span>
                        </div>
                        {isOverride && (
                          <div className="mt-2 space-y-2">
                            <select value={overrideReasonMap[line.grn_id] || ''} onChange={e => setOverrideReasonMap(prev => ({ ...prev, [line.grn_id]: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none">
                              <option value="">Select override reason...</option>
                              {overrideReasons.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            {!hasPendingOverride ? (
                              <button onClick={() => overrideMutation.mutate({ item_id: form.item_id, requested_grn_id: line.grn_id, available_grn_id: batches[0].grn_id, reason: overrideReasonMap[line.grn_id], requested_by: form.issued_by })}
                                disabled={!overrideReasonMap[line.grn_id] || overrideMutation.isPending}
                                className="w-full px-2 py-1.5 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 disabled:opacity-50">
                                Send Override Request
                              </button>
                            ) : (
                              <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">✓ Override request sent</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!splitValid && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600">
                    ⚠ Split total ({fmt(totalSplit)}) must equal issued qty ({fmt(parseFloat(form.issued_qty))})
                  </div>
                )}

                {issueMutation.isError && <p className="text-red-500 text-sm">Failed to issue material</p>}

                <div className="flex gap-3">
                  <button onClick={() => { setStep('form'); setSplitLines([]); }} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">← Back</button>
                  <button onClick={handleIssue}
                    disabled={!splitValid || issueMutation.isPending || splitLines.some((l, i) => needsOverride(l, i) && !overrideReasonMap[l.grn_id])}
                    className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                    {issueMutation.isPending ? 'Issuing...' : `Issue ${splitLines.length} Slip${splitLines.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3 — Success */}
        {step === 'success' && lastIssue && (
          <div className="p-5 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-medium text-green-700">✓ Material issued successfully</p>
              <p className="text-green-600 text-xs mt-1">Slip: {lastIssue.slip_number} | Total: {lastIssue.total_issued_qty} {lastIssue.item?.unit_of_measure}</p>
              <p className="text-green-600 text-xs mt-0.5">{lastIssue.lines?.length} batch line{lastIssue.lines?.length > 1 ? 's' : ''} issued</p>
              {purpose === 'melting' && selectedMWO && <p className="text-amber-600 text-xs mt-0.5">🔥 Against {selectedMWO.mwo_number} → {selectedMWO.furnace?.machine_code}</p>}
            </div>
            {lastIssue.lines?.length > 1 && (
              <div className="bg-surface rounded-xl p-3">
                <p className="text-xs font-medium text-text-secondary mb-2">Batch breakdown:</p>
                {lastIssue.lines?.map((l: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-t border-border">
                    <span>{l.batch_number || '—'}</span>
                    <span className="font-medium">{fmt(l.issued_qty)} {lastIssue.item?.unit_of_measure}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Close</button>
              <button onClick={() => printIssueSlip(lastIssue)} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark">
                🖨 Print Issue Slip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FifoIssueModal;
