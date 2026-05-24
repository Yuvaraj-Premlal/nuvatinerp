import React, { useState } from 'react';
import { printPO } from '../../utils/po.pdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    draft: 'bg-gray-50 text-gray-600',
    approved: 'bg-blue-50 text-blue-600',
    sent: 'bg-purple-50 text-purple-600',
    partial_received: 'bg-amber-50 text-amber-600',
    received: 'bg-green-50 text-green-600',
    cancelled: 'bg-red-50 text-red-600'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const CreatePOModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    supplier_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_terms: 'Net 30',
    notes: ''
  });
  const [lines, setLines] = useState([
    { item_id: '', quantity_ordered: '', unit_price: '', unit_of_measure: 'KG' }
  ]);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/api/suppliers').then(r => r.data.data)
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.get('/api/items').then(r => r.data.data)
  });

  const addLine = () => setLines([...lines, { item_id: '', quantity_ordered: '', unit_price: '', unit_of_measure: 'KG' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const totalValue = lines.reduce((sum, l) =>
    sum + (parseFloat(l.quantity_ordered || '0') * parseFloat(l.unit_price || '0')), 0);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/purchase', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      po_date: new Date(form.po_date).toISOString(),
      expected_delivery_date: form.expected_delivery_date ? new Date(form.expected_delivery_date).toISOString() : null,
      total_value: totalValue,
      lines: lines.map(l => ({
        ...l,
        quantity_ordered: parseFloat(l.quantity_ordered),
        unit_price: parseFloat(l.unit_price)
      }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Create Purchase Order</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">PO Number</label>
              <input
                value="Auto-generated on save"
                disabled
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier</label>
              <select
                value={form.supplier_id}
                onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="">Select supplier...</option>
                {suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">PO Date</label>
              <input
                type="date"
                value={form.po_date}
                onChange={e => setForm({ ...form, po_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Expected Delivery</label>
              <input
                type="date"
                value={form.expected_delivery_date}
                onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Terms</label>
              <select
                value={form.payment_terms}
                onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
                <option>Advance</option>
                <option>COD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Line Items</label>
              <button type="button" onClick={addLine} className="text-xs text-brand-primary hover:text-brand-dark font-medium">
                + Add Line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center bg-surface p-2 rounded-lg">
                  <div className="col-span-2">
                    <select
                      value={line.item_id}
                      onChange={e => updateLine(i, 'item_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="">Select item...</option>
                      {items?.filter((it: any) => it.item_type === 'raw_material' || it.item_type === 'consumable')
                        .map((it: any) => (
                          <option key={it.id} value={it.id}>{it.item_name}</option>
                        ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    value={line.quantity_ordered}
                    onChange={e => updateLine(i, 'quantity_ordered', e.target.value)}
                    placeholder="Qty"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <input
                    type="number"
                    value={line.unit_price}
                    onChange={e => updateLine(i, 'unit_price', e.target.value)}
                    placeholder="Unit price ₹"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <div className="flex items-center gap-1">
                    <select
                      value={line.unit_of_measure}
                      onChange={e => updateLine(i, 'unit_of_measure', e.target.value)}
                      className="flex-1 px-1 py-1.5 border border-border rounded text-xs focus:outline-none"
                    >
                      <option>KG</option>
                      <option>MT</option>
                      <option>PCS</option>
                      <option>LTR</option>
                    </select>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <p className="text-sm font-bold text-text-primary">
                Total: ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {mutation.isError && <p className="text-red-500 text-sm">Failed to create PO</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateGRNModal: React.FC<{ po: any; onClose: () => void }> = ({ po, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    grn_number: 'GRN-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4),
    received_date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    received_by: 'Storekeeper',
    lines: po.po_lines?.map((l: any) => ({
      po_line_id: l.id,
      item_id: l.item_id,
      item_name: l.item?.item_name || '',
      quantity_ordered: l.quantity_ordered,
      quantity_received: '',
      quantity_rejected: '0',
      unit_price: l.unit_price
    })) || []
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/grn', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      po_id: po.id,
      received_date: new Date(form.received_date).toISOString(),
      lines: form.lines.map((l: any) => ({
        ...l,
        quantity_received: parseFloat(l.quantity_received),
        quantity_rejected: parseFloat(l.quantity_rejected),
        unit_price: parseFloat(l.unit_price)
      }))
    });
  };

  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...form.lines];
    updated[i] = { ...updated[i], [field]: value };
    setForm({ ...form, lines: updated });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Create GRN</h2>
            <p className="text-text-secondary text-sm">Against {po.po_number}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">GRN Number</label>
              <input
                value={form.grn_number}
                onChange={e => setForm({ ...form, grn_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Received Date</label>
              <input
                type="date"
                value={form.received_date}
                onChange={e => setForm({ ...form, received_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Vehicle Number</label>
              <input
                value={form.vehicle_number}
                onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="e.g. TN01AB1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Received By</label>
              <input
                value={form.received_by}
                onChange={e => setForm({ ...form, received_by: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {form.lines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Items Received</label>
              <div className="space-y-2">
                {form.lines.map((line: any, i: number) => (
                  <div key={i} className="bg-surface p-3 rounded-lg">
                    <p className="text-sm font-medium text-text-primary mb-2">{line.item_name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-text-secondary">Ordered</label>
                        <p className="text-sm font-bold text-text-primary">{line.quantity_ordered}</p>
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Received</label>
                        <input
                          type="number"
                          value={line.quantity_received}
                          onChange={e => updateLine(i, 'quantity_received', e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Rejected</label>
                        <input
                          type="number"
                          value={line.quantity_rejected}
                          onChange={e => updateLine(i, 'quantity_rejected', e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mutation.isError && <p className="text-red-500 text-sm">Failed to create GRN</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Confirm GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const CreateBillButton: React.FC<{ grnId: string }> = ({ grnId }) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.post(`/api/finance/bills/from-grn/${grnId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierBills'] });
      alert('Supplier bill created successfully');
    },
    onError: () => alert('Failed to create bill — may already exist')
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
    >
      {mutation.isPending ? '...' : '+ Bill'}
    </button>
  );
};


const PODetailModal: React.FC<{ poId: string; onClose: () => void }> = ({ poId, onClose }) => {
  const { data: company } = useQuery({ queryKey: ['companyConfig'], queryFn: () => api.get('/api/finance/config').then(r => r.data.data) });
  const { data: po, isLoading } = useQuery({
    queryKey: ['po', poId],
    queryFn: () => api.get(`/api/purchase/${poId}`).then(r => r.data.data)
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">{po?.po_number}</h2>
            <p className="text-text-secondary text-sm">{po?.supplier?.supplier_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {po && <button onClick={() => printPO(po, company)} className="text-xs bg-brand-light text-brand-primary px-3 py-1.5 rounded-lg hover:bg-blue-100">🖨 Print PO</button>}
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-brand-primary animate-pulse">Loading...</div>
        ) : po ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-text-secondary">PO Date</p>
                <p className="font-medium">{new Date(po.po_date).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-text-secondary">Expected Delivery</p>
                <p className="font-medium">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN') : '—'}</p>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-text-secondary">Status</p>
                <p className="font-medium capitalize">{po.status}</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light">
                  <th className="text-left px-4 py-2 text-brand-primary">#</th>
                  <th className="text-left px-4 py-2 text-brand-primary">Item</th>
                  <th className="text-right px-4 py-2 text-brand-primary">Qty</th>
                  <th className="text-right px-4 py-2 text-brand-primary">Unit Price</th>
                  <th className="text-right px-4 py-2 text-brand-primary">Amount</th>
                </tr>
              </thead>
              <tbody>
                {po.po_lines?.map((line: any, i: number) => (
                  <tr key={line.id} className="border-t border-border">
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2">{line.item?.item_name}</td>
                    <td className="px-4 py-2 text-right">{line.quantity_ordered} {line.item?.unit_of_measure}</td>
                    <td className="px-4 py-2 text-right">₹{line.unit_price}</td>
                    <td className="px-4 py-2 text-right font-medium">₹{(line.quantity_ordered * line.unit_price).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-light">
                  <td colSpan={4} className="px-4 py-2 font-bold text-right">Total</td>
                  <td className="px-4 py-2 font-bold text-right text-brand-primary">
                    ₹{po.po_lines?.reduce((s: number, l: any) => s + l.quantity_ordered * l.unit_price, 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};


const CancelPOModal: React.FC<{ po: any; onClose: () => void }> = ({ po, onClose }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post(`/api/purchase/${po.id}/cancel`, { reason, cancelled_by: 'Purchase Manager' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); onClose(); },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to cancel PO')
  });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Cancel PO</h2>
            <p className="text-text-secondary text-sm">{po.po_number}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            This action cannot be undone. The PO will be marked as cancelled.
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Cancellation Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={3} placeholder="Reason for cancellation..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Keep PO</button>
            <button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              {mutation.isPending ? 'Cancelling...' : 'Cancel PO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AmendPOModal: React.FC<{ po: any; onClose: () => void }> = ({ po, onClose }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [expectedDate, setExpectedDate] = useState(po.expected_delivery_date ? new Date(po.expected_delivery_date).toISOString().split('T')[0] : '');
  const [lines, setLines] = useState(po.po_lines?.map((l: any) => ({
    item_id: l.item_id,
    item_name: l.item?.item_name || '',
    quantity_ordered: l.quantity_ordered,
    unit_price: l.unit_price
  })) || []);

  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/purchase/${po.id}/amend`, {
      amendment_reason: reason,
      amended_by: 'Purchase Manager',
      expected_delivery_date: expectedDate,
      lines: lines.map((l: any) => ({ ...l, quantity_ordered: parseFloat(l.quantity_ordered), unit_price: parseFloat(l.unit_price) }))
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); onClose(); },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to amend PO')
  });

  const total = lines.reduce((s: number, l: any) => s + parseFloat(l.quantity_ordered || 0) * parseFloat(l.unit_price || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Amend PO — Rev {po.revision_number + 1}</h2>
            <p className="text-text-secondary text-sm">{po.po_number} | Current: Rev {po.revision_number}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            Amending will create Rev {po.revision_number + 1}. Previous revision will be archived.
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Amendment Reason <span className="text-red-500">*</span></label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. Quantity revised as per revised requirement" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Expected Delivery Date</label>
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Line Items</label>
            <div className="space-y-2">
              {lines.map((line: any, i: number) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-center bg-surface p-2 rounded-lg">
                  <p className="text-sm font-medium text-text-primary col-span-1">{line.item_name}</p>
                  <div>
                    <label className="text-xs text-text-secondary">Quantity</label>
                    <input type="number" value={line.quantity_ordered} onChange={e => updateLine(i, 'quantity_ordered', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary">Unit Price ₹</label>
                    <input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-right text-sm font-bold text-brand-primary mt-2">
              Total: ₹{total.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
              {mutation.isPending ? 'Amending...' : `Save Rev ${po.revision_number + 1}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Purchase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('po');
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [viewPOId, setViewPOId] = useState<string | null>(null);
  const [cancelPO, setCancelPO] = useState<any>(null);
  const [amendPO, setAmendPO] = useState<any>(null);

  const { data: pos, isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.get('/api/purchase').then(r => r.data.data)
  });

  const { data: grns } = useQuery({
    queryKey: ['grns'],
    queryFn: () => api.get('/api/grn').then(r => r.data.data)
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/purchase/${id}/approve`, {}),
    onSuccess: () => {
      useQueryClient().invalidateQueries({ queryKey: ['purchaseOrders'] });
    }
  });

  const queryClient = useQueryClient();

  const summary = {
    total: pos?.length || 0,
    draft: pos?.filter((p: any) => p.status === 'draft').length || 0,
    approved: pos?.filter((p: any) => p.status === 'approved').length || 0,
    received: pos?.filter((p: any) => p.status === 'received').length || 0
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading purchase data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {showCreatePO && <CreatePOModal onClose={() => setShowCreatePO(false)} />}
      {selectedPO && <CreateGRNModal po={selectedPO} onClose={() => setSelectedPO(null)} />}
      {viewPOId && <PODetailModal poId={viewPOId} onClose={() => setViewPOId(null)} />}
      {cancelPO && <CancelPOModal po={cancelPO} onClose={() => setCancelPO(null)} />}
      {amendPO && <AmendPOModal po={amendPO} onClose={() => setAmendPO(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Purchase</h1>
          <p className="text-text-secondary text-sm mt-1">Purchase orders and goods receipt</p>
        </div>
        <button
          onClick={() => setShowCreatePO(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
        >
          + New PO
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Total POs</p>
          <p className="text-3xl font-bold mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Pending Approval</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{summary.draft}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Approved</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{summary.approved}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Received</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{summary.received}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['po', 'grn'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {tab === 'po' ? 'Purchase Orders' : 'GRN'}
          </button>
        ))}
      </div>

      {activeTab === 'po' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Expected</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Raised By</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos?.map((po: any, i: number) => (
                <tr key={po.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary cursor-pointer hover:underline" onClick={() => setViewPOId(po.id)}>{po.po_number} {po.revision_number > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">Rev {po.revision_number}</span>}</td>
                  <td className="px-4 py-3 text-text-primary">{po.supplier?.supplier_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(po.po_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      po.raised_by === 'agent' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-600'
                    }`}>{po.raised_by}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {po.status === 'draft' && (
                        <button
                          onClick={() => {
                            api.put(`/api/purchase/${po.id}/approve`, {}).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                            });
                          }}
                          className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100"
                        >
                          Approve
                        </button>
                      )}
                      {(po.status === 'approved' || po.status === 'sent') && (
                        <button
                          onClick={() => setSelectedPO(po)}
                          className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100"
                        >
                          + GRN
                        </button>
                      )}
                      {(po.status === 'approved' || po.status === 'sent') && (
                        <button onClick={() => setAmendPO(po)}
                          className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded hover:bg-amber-100">
                          Amend
                        </button>
                      )}
                      {po.status !== 'cancelled' && po.status !== 'closed' && (
                        <button onClick={() => setCancelPO(po)}
                          className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pos?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No purchase orders found</div>
          )}
        </div>
      )}

      {activeTab === 'grn' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">GRN Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Received Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Vehicle</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Received By</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Bill</th>
              </tr>
            </thead>
            <tbody>
              {grns?.map((grn: any, i: number) => (
                <tr key={grn.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{grn.grn_number}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(grn.received_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{grn.vehicle_number || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{grn.received_by || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <CreateBillButton grnId={grn.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {grns?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No GRNs found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Purchase;
