import React, { useState } from 'react';
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
  const [step, setStep] = useState<'form' | 'batch' | 'override' | 'success'>('form');
  const [form, setForm] = useState({ job_id: '', item_id: '', planned_qty: '', issued_qty: '', issued_by: 'Storekeeper' });
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [lastIssue, setLastIssue] = useState<any>(null);
  const [pendingOverride, setPendingOverride] = useState<any>(null);

  const { data: jobs } = useQuery({ queryKey: ['jobcards'], queryFn: () => api.get('/api/jobcards').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });

  const { data: batchData, isLoading: batchLoading } = useQuery({
    queryKey: ['availableBatches', form.item_id],
    queryFn: () => api.get(`/api/stock/available-batches?item_id=${form.item_id}`).then(r => r.data.data),
    enabled: !!form.item_id && step === 'batch'
  });

  const batches = batchData || [];
  const fifoRecommended = batches.find((b: any) => b.fifo_recommended);

  const issueMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/stock/issue', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setLastIssue(res.data.data);
      setStep('success');
    }
  });

  const overrideMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/stock/fifo-override-request', data),
    onSuccess: (res: any) => {
      setPendingOverride(res.data.data);
    }
  });

  const handleFormNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('batch');
  };

  const handleBatchSelect = (batch: any) => {
    setSelectedBatch(batch);
  };

  const handleIssue = () => {
    if (!selectedBatch) return;
    const isFifoOverride = fifoRecommended && selectedBatch.grn_id !== fifoRecommended.grn_id;
    if (isFifoOverride && !pendingOverride) {
      setStep('override');
      return;
    }
    issueMutation.mutate({
      job_id: form.job_id,
      item_id: form.item_id,
      planned_qty: parseFloat(form.planned_qty),
      issued_qty: parseFloat(form.issued_qty),
      issued_by: form.issued_by,
      batch_number: selectedBatch.batch_number,
      grn_id: selectedBatch.grn_id,
      fifo_override: !!(fifoRecommended && selectedBatch.grn_id !== fifoRecommended.grn_id),
      override_reason: overrideReason || null,
      override_request_id: pendingOverride?.id || null
    });
  };

  const handleOverrideRequest = () => {
    if (!overrideReason) return;
    overrideMutation.mutate({
      item_id: form.item_id,
      requested_grn_id: selectedBatch.grn_id,
      available_grn_id: fifoRecommended.grn_id,
      reason: overrideReason,
      requested_by: form.issued_by
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Issue Material</h2>
            <p className="text-text-secondary text-sm">
              {step === 'form' && 'Select job and material'}
              {step === 'batch' && 'Select batch (FIFO order)'}
              {step === 'override' && 'FIFO Override Request'}
              {step === 'success' && 'Material issued successfully'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>

        {/* Step 1 — Form */}
        {step === 'form' && (
          <form onSubmit={handleFormNext} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Job Card</label>
              <select value={form.job_id} onChange={e => setForm({ ...form, job_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
                <option value="">Select job...</option>
                {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.job_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Material</label>
              <select value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
                <option value="">Select item...</option>
                {items?.filter((i: any) => i.item_type === 'raw_material' || i.item_type === 'consumable')
                  .map((i: any) => <option key={i.id} value={i.id}>{i.item_name} ({i.item_code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Planned Qty</label>
                <input type="number" value={form.planned_qty} onChange={e => setForm({ ...form, planned_qty: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Issued Qty</label>
                <input type="number" value={form.issued_qty} onChange={e => setForm({ ...form, issued_qty: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Issued By</label>
              <input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark">Next → Select Batch</button>
            </div>
          </form>
        )}

        {/* Step 2 — Batch Selection */}
        {step === 'batch' && (
          <div className="p-5 space-y-4">
            {batchLoading ? (
              <div className="text-center py-8 text-brand-primary animate-pulse">Loading batches...</div>
            ) : batches.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  <p className="font-medium">⚠ No batches found for this item</p>
                  <p className="text-xs mt-1">No GRNs with batch numbers exist. Issue will proceed without batch tracking.</p>
                </div>
                <button onClick={() => issueMutation.mutate({ job_id: form.job_id, item_id: form.item_id, planned_qty: parseFloat(form.planned_qty), issued_qty: parseFloat(form.issued_qty), issued_by: form.issued_by })}
                  disabled={issueMutation.isPending}
                  className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                  {issueMutation.isPending ? 'Issuing...' : 'Issue Without Batch'}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                  <p className="font-medium">📋 FIFO Order — Select batch to issue from</p>
                  <p className="mt-0.5">Oldest GRN is highlighted and recommended. Select a different batch to request override.</p>
                </div>
                <div className="space-y-2">
                  {batches.map((batch: any, i: number) => (
                    <div key={batch.grn_id}
                      onClick={() => handleBatchSelect(batch)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedBatch?.grn_id === batch.grn_id ? 'border-brand-primary bg-brand-light' : batch.fifo_recommended ? 'border-green-400 bg-green-50' : 'border-border bg-white hover:bg-surface'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-text-primary">{batch.batch_number}</p>
                            {batch.fifo_recommended && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">⚡ FIFO Recommended</span>}
                            {i > 0 && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">Override needed</span>}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">GRN: {batch.grn_number} | {batch.supplier_name}</p>
                          <p className="text-xs text-text-secondary">Received: {new Date(batch.received_date).toLocaleDateString('en-IN')} | PO: {batch.po_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-green-600">{fmt(batch.remaining_qty)}</p>
                          <p className="text-xs text-text-secondary">{batch.unit_of_measure} available</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedBatch && parseFloat(form.issued_qty) > selectedBatch.remaining_qty && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600">
                    ⚠ Issued qty ({form.issued_qty}) exceeds available in this batch ({fmt(selectedBatch.remaining_qty)}). Please create multiple issue slips.
                  </div>
                )}
                {issueMutation.isError && <p className="text-red-500 text-sm">Failed to issue material</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep('form')} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">← Back</button>
                  <button onClick={handleIssue} disabled={!selectedBatch || issueMutation.isPending || parseFloat(form.issued_qty) > selectedBatch.remaining_qty}
                    className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                    {issueMutation.isPending ? 'Issuing...' : selectedBatch && fifoRecommended && selectedBatch.grn_id !== fifoRecommended.grn_id ? 'Request Override' : 'Issue Material'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3 — Override Request */}
        {step === 'override' && (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-amber-700">⚠ FIFO Override Required</p>
              <div className="mt-2 space-y-1 text-xs text-amber-600">
                <p>Available (older): <strong>{fifoRecommended?.grn_number}</strong> — {fmt(fifoRecommended?.remaining_qty)} {fifoRecommended?.unit_of_measure} | Received {new Date(fifoRecommended?.received_date).toLocaleDateString('en-IN')}</p>
                <p>Requesting (newer): <strong>{selectedBatch?.grn_number}</strong> — {fmt(selectedBatch?.remaining_qty)} {selectedBatch?.unit_of_measure} | Received {new Date(selectedBatch?.received_date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Reason for Override <span className="text-red-500">*</span></label>
              <select value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
                <option value="">Select reason...</option>
                {overrideReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {!pendingOverride ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  ℹ Override request will be sent to the owner for approval. You will be notified once approved. Request expires in 60 minutes.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('batch')} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">← Back</button>
                  <button onClick={handleOverrideRequest} disabled={!overrideReason || overrideMutation.isPending}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                    {overrideMutation.isPending ? 'Requesting...' : 'Send Override Request'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                  <p className="font-medium text-green-700">✓ Override request sent to owner</p>
                  <p className="text-xs text-green-600 mt-1">Once approved, click "Proceed with Issue" below.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Close — Issue Later</button>
                  <button onClick={handleIssue} disabled={issueMutation.isPending}
                    className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                    {issueMutation.isPending ? 'Issuing...' : 'Proceed with Issue'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4 — Success */}
        {step === 'success' && lastIssue && (
          <div className="p-5 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-medium text-green-700">✓ Material issued successfully</p>
              <p className="text-green-600 text-xs mt-1">Slip: {lastIssue.slip_number} | Qty: {lastIssue.issued_qty} {lastIssue.item?.unit_of_measure}</p>
              {lastIssue.batch_number && <p className="text-green-600 text-xs mt-0.5">Batch: {lastIssue.batch_number} | GRN: {selectedBatch?.grn_number}</p>}
              {lastIssue.fifo_override && <p className="text-amber-600 text-xs mt-0.5">⚠ FIFO Override applied — Reason: {lastIssue.override_reason}</p>}
            </div>
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
