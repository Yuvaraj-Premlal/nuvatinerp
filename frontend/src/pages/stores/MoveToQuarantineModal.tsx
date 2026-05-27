import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const quarantineReasons = [
  'Physical damage — dents, cracks, broken packaging',
  'Contamination — oil, water, foreign material',
  'Dimensional non-conformance',
  'Wrong material — does not match specification',
  'Expired shelf life',
  'Supplier quality issue — discovered in stores',
  'Other'
];

const MoveToQuarantineModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    item_id: '',
    batch_number: '',
    grn_id: '',
    quantity: '',
    reason: '',
    moved_by: 'Storekeeper'
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.get('/api/items').then(r => r.data.data)
  });

  const { data: batchData } = useQuery({
    queryKey: ['availableBatches', form.item_id],
    queryFn: () => api.get(`/api/stock/available-batches?item_id=${form.item_id}`).then(r => r.data.data),
    enabled: !!form.item_id,
    staleTime: 0
  });

  const batches = batchData || [];
  const selectedBatch = batches.find((b: any) => b.batch_number === form.batch_number);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/quarantine/move', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarantine'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['availableBatches'] });
      alert('✓ Stock moved to quarantine successfully');
      onClose();
    },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to move to quarantine')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatch && parseFloat(form.quantity) > selectedBatch.remaining_qty) {
      alert(`Cannot quarantine more than available: ${selectedBatch.remaining_qty} ${selectedBatch.unit_of_measure}`);
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Move to Quarantine</h2>
            <p className="text-text-secondary text-sm">For stock problems discovered in stores</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            ⚠ Use this when material received OK but problem found later in stores. Stock will be deducted and moved to quarantine for QC disposition.
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Item <span className="text-red-500">*</span></label>
            <select value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value, batch_number: '', grn_id: '' })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
              <option value="">Select item...</option>
              {items?.map((i: any) => <option key={i.id} value={i.id}>{i.item_name} ({i.item_code})</option>)}
            </select>
          </div>

          {form.item_id && batches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Batch <span className="text-red-500">*</span></label>
              <select value={form.batch_number} onChange={e => {
                const batch = batches.find((b: any) => b.batch_number === e.target.value);
                setForm({ ...form, batch_number: e.target.value, grn_id: batch?.grn_id || '' });
              }}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
                <option value="">Select batch...</option>
                {batches.map((b: any) => (
                  <option key={b.grn_id} value={b.batch_number}>
                    {b.batch_number} | {b.grn_number} | {b.remaining_qty} {b.unit_of_measure} available
                  </option>
                ))}
              </select>
              {selectedBatch && (
                <p className="text-xs text-text-secondary mt-1">
                  Available: <strong>{selectedBatch.remaining_qty} {selectedBatch.unit_of_measure}</strong> | Received: {new Date(selectedBatch.received_date).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          )}

          {form.item_id && batches.length === 0 && (
            <div className="bg-surface rounded-lg p-3 text-xs text-text-secondary">
              No batches with available stock found for this item.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Quantity to Quarantine <span className="text-red-500">*</span></label>
            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary ${selectedBatch && parseFloat(form.quantity) > selectedBatch.remaining_qty ? 'border-red-400 bg-red-50' : 'border-border'}`}
              placeholder={selectedBatch ? `Max: ${selectedBatch.remaining_qty}` : 'Enter quantity'}
              required />
            {selectedBatch && parseFloat(form.quantity) > selectedBatch.remaining_qty && (
              <p className="text-xs text-red-500 mt-0.5">⚠ Exceeds available qty ({selectedBatch.remaining_qty})</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Reason <span className="text-red-500">*</span></label>
            <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
              <option value="">Select reason...</option>
              {quarantineReasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Moved By</label>
            <input value={form.moved_by} onChange={e => setForm({ ...form, moved_by: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending || !form.batch_number || !form.quantity || !form.reason}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
              {mutation.isPending ? 'Moving...' : 'Move to Quarantine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveToQuarantineModal;
