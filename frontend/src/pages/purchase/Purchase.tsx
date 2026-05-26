import React, { useState } from 'react';
import { printPO } from '../../utils/po.pdf';
import { printGRN } from '../../utils/grn.pdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    draft: 'bg-gray-50 text-gray-600',
    approved: 'bg-blue-50 text-blue-600',
    sent: 'bg-purple-50 text-purple-600',
    partial_received: 'bg-amber-50 text-amber-600',
    received: 'bg-green-50 text-green-600',
    cancelled: 'bg-red-50 text-red-600',
    closed: 'bg-gray-100 text-gray-500'
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

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/api/suppliers').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const { data: stockData } = useQuery({ queryKey: ['stock'], queryFn: () => api.get('/api/stock').then(r => r.data.data) });

  const getStockInfo = (item_id: string) => {
    if (!item_id || !stockData) return null;
    return stockData.find((s: any) => s.item_id === item_id) || null;
  };

  const addLine = () => setLines([...lines, { item_id: '', quantity_ordered: '', unit_price: '', unit_of_measure: 'KG' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const totalValue = lines.reduce((sum, l) => sum + (parseFloat(l.quantity_ordered || '0') * parseFloat(l.unit_price || '0')), 0);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/purchase', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      po_date: new Date(form.po_date).toISOString(),
      expected_delivery_date: form.expected_delivery_date ? new Date(form.expected_delivery_date).toISOString() : null,
      total_value: totalValue,
      lines: lines.map(l => ({ ...l, quantity_ordered: parseFloat(l.quantity_ordered), unit_price: parseFloat(l.unit_price) }))
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
              <input value="Auto-generated on save" disabled className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
                <option value="">Select supplier...</option>
                {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">PO Date</label>
              <input type="date" value={form.po_date} onChange={e => setForm({ ...form, po_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Expected Delivery</label>
              <input type="date" value={form.expected_delivery_date} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Terms</label>
              <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance</option><option>COD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Optional notes..." />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Line Items</label>
              <button type="button" onClick={addLine} className="text-xs text-brand-primary hover:text-brand-dark font-medium">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center bg-surface p-2 rounded-lg">
                  <div className="col-span-2">
                    <select value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                      <option value="">Select item...</option>
                      {items?.filter((it: any) => it.item_type === 'raw_material' || it.item_type === 'consumable')
                        .map((it: any) => <option key={it.id} value={it.id}>{it.item_name}</option>)}
                    </select>
                    {(() => {
                      const stock = getStockInfo(line.item_id);
                      if (!stock) return null;
                      const qty = stock.quantity_on_hand;
                      const reorder = stock.reorder_point;
                      const safety = stock.safety_stock;
                      const isRed = qty <= safety;
                      const isAmber = qty > safety && qty <= reorder;
                      const isGreen = qty > reorder;
                      return (
                        <div className={`mt-1 px-2 py-1 rounded text-xs flex items-center gap-1 ${isRed ? 'bg-red-50 text-red-600' : isAmber ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                          <span>{isRed ? '🔴' : isAmber ? '🟡' : '🟢'}</span>
                          <span>Stock: {qty.toLocaleString('en-IN')} {stock.unit_of_measure}</span>
                          <span className="text-gray-400 mx-1">|</span>
                          <span>Reorder: {reorder.toLocaleString('en-IN')}</span>
                          {isRed && <span className="font-medium ml-1">— Critical</span>}
                          {isAmber && <span className="font-medium ml-1">— Below Reorder</span>}
                          {isGreen && <span className="font-medium ml-1">— Adequate</span>}
                        </div>
                      );
                    })()}
                  </div>
                  <input type="number" value={line.quantity_ordered} onChange={e => updateLine(i, 'quantity_ordered', e.target.value)}
                    placeholder="Qty" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  <input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)}
                    placeholder="Price ₹" className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  <div className="flex items-center gap-1">
                    <select value={line.unit_of_measure} onChange={e => updateLine(i, 'unit_of_measure', e.target.value)}
                      className="flex-1 px-1 py-1.5 border border-border rounded text-xs focus:outline-none">
                      <option>KG</option><option>MT</option><option>PCS</option><option>LTR</option>
                    </select>
                    {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <p className="text-sm font-bold text-text-primary">Total: ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to create PO</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
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
    received_date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    received_by: 'Storekeeper',
    lines: po.po_lines?.map((l: any) => ({
      po_line_id: l.id, item_id: l.item_id, item_name: l.item?.item_name || '',
      quantity_ordered: l.quantity_ordered, quantity_received: '', quantity_rejected: '0', unit_price: l.unit_price
    })) || []
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/grn', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['grns'] }); queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); queryClient.invalidateQueries({ queryKey: ['stock'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form, po_id: po.id, received_date: new Date(form.received_date).toISOString(),
      lines: form.lines.map((l: any) => {
        const received = parseFloat(l.quantity_received);
        const rejected = parseFloat(l.quantity_rejected || 0);
        const accepted = received - rejected;
        return { ...l, quantity_received: received, quantity_rejected: rejected, accepted_qty: accepted, unit_price: parseFloat(l.unit_price) };
      })
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
          <div><h2 className="font-bold text-text-primary">Create GRN</h2><p className="text-text-secondary text-sm">Against {po.po_number}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">GRN Number</label>
              <input value="Auto-generated on save" disabled
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Received Date</label>
              <input type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Vehicle Number</label>
              <input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. TN01AB1234" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Received By</label>
              <input value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
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
                      <div><label className="text-xs text-text-secondary">Ordered</label><p className="text-sm font-bold text-text-primary">{line.quantity_ordered}</p></div>
                      <div>
                        <label className="text-xs text-text-secondary">Received</label>
                        <input type="number" value={line.quantity_received} onChange={e => updateLine(i, 'quantity_received', e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary" required />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Rejected</label>
                        <input type="number" value={line.quantity_rejected} onChange={e => updateLine(i, 'quantity_rejected', e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Accepted (auto)</label>
                        <p className={`text-sm font-bold ${parseFloat(line.quantity_received||'0') - parseFloat(line.quantity_rejected||'0') < parseFloat(line.quantity_received||'0') ? 'text-amber-600' : 'text-green-600'}`}>
                          {parseFloat(line.quantity_received||'0') - parseFloat(line.quantity_rejected||'0')} {line.item?.unit_of_measure || ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mutation.isError && <p className="text-red-500 text-sm">Failed to create GRN</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supplierBills'] }); alert('Supplier bill created successfully'); },
    onError: () => alert('Failed to create bill — may already exist')
  });
  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
      className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50">
      {mutation.isPending ? '...' : '+ Bill'}
    </button>
  );
};

const GRNHistorySection: React.FC<{ poId: string }> = ({ poId }) => {
  const [viewGRNId, setViewGRNId] = useState<string | null>(null);
  const { data: allGrns } = useQuery({ queryKey: ['grns'], queryFn: () => api.get('/api/grn').then(r => r.data.data) });
  const poGrns = allGrns?.filter((g: any) => g.po_id === poId) || [];

  if (poGrns.length === 0) return null;

  return (
    <div>
      {viewGRNId && <GRNDetailModal grnId={viewGRNId} onClose={() => setViewGRNId(null)} />}
      <p className="text-sm font-medium text-text-primary mb-2">GRN History ({poGrns.length})</p>
      <div className="space-y-2">
        {poGrns.map((g: any) => {
          const totalAccepted = g.grn_lines?.reduce((s: number, l: any) => s + (l.accepted_qty || l.quantity_received), 0) || 0;
          const totalRejected = g.grn_lines?.reduce((s: number, l: any) => s + (l.rejected_qty || 0), 0) || 0;
          return (
            <div key={g.id} className={`border rounded-lg p-3 text-xs cursor-pointer hover:bg-surface ${g.is_reversed ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
              onClick={() => setViewGRNId(g.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brand-primary">{g.grn_number}</span>
                  {g.is_reversed && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Reversed</span>}
                </div>
                <span className="text-text-secondary">{new Date(g.received_date).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex gap-4 mt-1">
                <span className="text-green-600">✓ Accepted: {totalAccepted}</span>
                {totalRejected > 0 && <span className="text-red-500">✗ Rejected: {totalRejected}</span>}
                <span className="text-text-secondary">By: {g.received_by || '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PODetailModal: React.FC<{ poId: string; onClose: () => void }> = ({ poId, onClose }) => {
  const { data: company } = useQuery({ queryKey: ['companyConfig'], queryFn: () => api.get('/api/finance/config').then(r => r.data.data) });
  const { data: po, isLoading } = useQuery({ queryKey: ['po', poId], queryFn: () => api.get(`/api/purchase/${poId}`).then(r => r.data.data) });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">{po?.po_number}</h2><p className="text-text-secondary text-sm">{po?.supplier?.supplier_name}</p></div>
          <div className="flex items-center gap-2">
            {po && <button onClick={() => printPO(po, company)} className="text-xs bg-brand-light text-brand-primary px-3 py-1.5 rounded-lg hover:bg-blue-100">🖨 Print PO</button>}
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
          </div>
        </div>
        {isLoading ? <div className="p-8 text-center text-brand-primary animate-pulse">Loading...</div> : po ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">PO Date</p><p className="font-medium">{new Date(po.po_date).toLocaleDateString('en-IN')}</p></div>
              <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Expected Delivery</p><p className="font-medium">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN') : '—'}</p></div>
              <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Payment Terms</p><p className="font-medium">{po.payment_terms || '—'}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-brand-light">
                <th className="text-left px-4 py-2 text-brand-primary">#</th>
                <th className="text-left px-4 py-2 text-brand-primary">Item</th>
                <th className="text-right px-4 py-2 text-brand-primary">Qty</th>
                <th className="text-right px-4 py-2 text-brand-primary">Unit Price</th>
                <th className="text-right px-4 py-2 text-brand-primary">Amount</th>
              </tr></thead>
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
              <tfoot><tr className="bg-brand-light">
                <td colSpan={4} className="px-4 py-2 font-bold text-right">Total</td>
                <td className="px-4 py-2 font-bold text-right text-brand-primary">₹{po.po_lines?.reduce((s: number, l: any) => s + l.quantity_ordered * l.unit_price, 0).toLocaleString('en-IN')}</td>
              </tr></tfoot>
            </table>
            {po.amendments?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Amendment History</p>
                <div className="space-y-2">
                  {po.amendments.map((a: any) => (
                    <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                      <p className="font-medium text-amber-700">Rev {a.revision_from} → Rev {a.revision_to}</p>
                      <p className="text-amber-600 mt-1">{a.amendment_reason}</p>
                      <p className="text-amber-500 mt-1">{new Date(a.amended_at).toLocaleDateString('en-IN')} by {a.amended_by}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <GRNHistorySection poId={poId} />
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
          <div><h2 className="font-bold text-text-primary">Cancel PO</h2><p className="text-text-secondary text-sm">{po.po_number}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">This action cannot be undone. The PO will be marked as cancelled.</div>
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
    item_id: l.item_id, item_name: l.item?.item_name || '', quantity_ordered: l.quantity_ordered, unit_price: l.unit_price
  })) || []);

  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines]; updated[i] = { ...updated[i], [field]: value }; setLines(updated);
  };

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/purchase/${po.id}/amend`, {
      amendment_reason: reason, amended_by: 'Purchase Manager', expected_delivery_date: expectedDate,
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
          <div><h2 className="font-bold text-text-primary">Amend PO — Rev {po.revision_number + 1}</h2><p className="text-text-secondary text-sm">{po.po_number} | Current: Rev {po.revision_number}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">Amending will create Rev {po.revision_number + 1}. Previous revision will be archived.</div>
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
                  <p className="text-sm font-medium text-text-primary">{line.item_name}</p>
                  <div><label className="text-xs text-text-secondary">Quantity</label>
                    <input type="number" value={line.quantity_ordered} onChange={e => updateLine(i, 'quantity_ordered', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary" /></div>
                  <div><label className="text-xs text-text-secondary">Unit Price ₹</label>
                    <input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary" /></div>
                </div>
              ))}
            </div>
            <p className="text-right text-sm font-bold text-brand-primary mt-2">Total: ₹{total.toLocaleString('en-IN')}</p>
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

const GRNDetailModal: React.FC<{ grnId: string; onClose: () => void }> = ({ grnId, onClose }) => {
  const queryClient = useQueryClient();
  const { data: company } = useQuery({ queryKey: ['companyConfig'], queryFn: () => api.get('/api/finance/config').then(r => r.data.data) });
  const { data: grnData, isLoading } = useQuery({ queryKey: ['grn', grnId], queryFn: () => api.get(`/api/grn/${grnId}`).then(r => r.data.data) });

  const billMutation = useMutation({
    mutationFn: () => api.post(`/api/finance/bills/from-grn/${grnId}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['grn', grnId] }); alert('Supplier bill created successfully'); },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to create bill')
  });

  const subtotal = grnData?.grn_lines?.reduce((s: number, l: any) => s + (l.accepted_qty || l.quantity_received) * (l.unit_price || 0), 0) || 0;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">{grnData?.grn_number}</h2>
            <p className="text-text-secondary text-sm">
              Against PO: <span className="text-brand-primary font-medium">{grnData?.po?.po_number || '—'}</span>
              {grnData?.is_reversed && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Reversed</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {grnData && !grnData.is_reversed && (
              <>
                <button onClick={() => printGRN(grnData, company)} className="text-xs bg-brand-light text-brand-primary px-3 py-1.5 rounded-lg hover:bg-blue-100">🖨 Print GRN</button>
                {!grnData.bill && <button onClick={() => billMutation.mutate()} disabled={billMutation.isPending} className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50">{billMutation.isPending ? '...' : '+ Create Bill'}</button>}
              </>
            )}
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
          </div>
        </div>
        {isLoading ? <div className="p-8 text-center text-brand-primary animate-pulse">Loading...</div> : grnData ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Received Date</p><p className="font-medium">{new Date(grnData.received_date).toLocaleDateString('en-IN')}</p></div>
              <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Vehicle</p><p className="font-medium">{grnData.vehicle_number || '—'}</p></div>
              <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Received By</p><p className="font-medium">{grnData.received_by || '—'}</p></div>
              <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Supplier</p><p className="font-medium">{grnData.po?.supplier?.supplier_name || '—'}</p></div>
            </div>

            <table className="w-full text-sm">
              <thead><tr className="bg-brand-light">
                <th className="text-left px-3 py-2 text-brand-primary">#</th>
                <th className="text-left px-3 py-2 text-brand-primary">Item</th>
                <th className="text-right px-3 py-2 text-brand-primary">Received</th>
                <th className="text-right px-3 py-2 text-green-600">Accepted</th>
                <th className="text-right px-3 py-2 text-red-500">Rejected</th>
                <th className="text-right px-3 py-2 text-brand-primary">Unit Price</th>
                <th className="text-right px-3 py-2 text-brand-primary">Amount</th>
              </tr></thead>
              <tbody>
                {grnData.grn_lines?.map((line: any, i: number) => (
                  <tr key={line.id} className="border-t border-border">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{line.item?.item_name}</p>
                      <p className="text-xs text-text-secondary">{line.item?.item_code}</p>
                      {line.rejection_reason && <p className="text-xs text-red-500 mt-0.5">Reason: {line.rejection_reason}</p>}
                    </td>
                    <td className="px-3 py-2 text-right">{line.quantity_received} {line.item?.unit_of_measure}</td>
                    <td className="px-3 py-2 text-right text-green-600 font-medium">{line.accepted_qty || line.quantity_received}</td>
                    <td className="px-3 py-2 text-right text-red-500 font-medium">{line.rejected_qty || 0}</td>
                    <td className="px-3 py-2 text-right">₹{line.unit_price || 0}</td>
                    <td className="px-3 py-2 text-right font-medium">₹{((line.accepted_qty || line.quantity_received) * (line.unit_price || 0)).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface"><td colSpan={6} className="px-3 py-2 text-right font-medium">Subtotal</td><td className="px-3 py-2 text-right font-bold">₹{subtotal.toLocaleString('en-IN')}</td></tr>
                <tr className="bg-surface"><td colSpan={6} className="px-3 py-2 text-right text-text-secondary">GST (18%)</td><td className="px-3 py-2 text-right text-text-secondary">₹{gst.toLocaleString('en-IN', {maximumFractionDigits:0})}</td></tr>
                <tr className="bg-brand-light"><td colSpan={6} className="px-3 py-2 text-right font-bold text-brand-primary">Total</td><td className="px-3 py-2 text-right font-bold text-brand-primary">₹{total.toLocaleString('en-IN', {maximumFractionDigits:0})}</td></tr>
              </tfoot>
            </table>

            {grnData.bill && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-700">Supplier Bill Created</p>
                <p className="text-green-600 text-xs mt-1">Bill: {grnData.bill.bill_number} | Amount: ₹{grnData.bill.total_amount?.toLocaleString('en-IN')} | Status: {grnData.bill.status}</p>
              </div>
            )}

            {grnData.is_reversed && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-red-700">GRN Reversed</p>
                <p className="text-red-600 text-xs mt-1">Reason: {grnData.reversal_reason} | Date: {grnData.reversed_at ? new Date(grnData.reversed_at).toLocaleDateString('en-IN') : '—'}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ClosePOModal: React.FC<{ po: any; onClose: () => void }> = ({ po, onClose }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'checking' | 'normal' | 'override' | 'no_bill'>('checking');
  const [billInfo, setBillInfo] = useState<any>(null);
  const [closedBy, setClosedBy] = useState('Purchase Manager');
  const [closureNotes, setClosureNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Try normal close first to check bill status
  const checkMutation = useMutation({
    mutationFn: () => api.post(`/api/purchase/${po.id}/close`, { closed_by: closedBy }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); onClose(); },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data?.requires_override) {
        setBillInfo(data);
        setStep('override');
      } else if (data?.bill_status === 'no_bill') {
        setStep('no_bill');
      } else {
        alert(data?.error || 'Failed to close PO');
      }
    }
  });

  const overrideMutation = useMutation({
    mutationFn: () => api.post(`/api/purchase/${po.id}/close`, {
      closed_by: closedBy,
      closure_notes: overrideReason,
      override: true
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); onClose(); },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to close PO')
  });

  const overrideOptions = [
    'Adjusted against debit note',
    'Quality dispute — amount withheld pending resolution',
    'Partial payment accepted by supplier',
    'Payment to be processed in next cycle',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Close PO</h2><p className="text-text-secondary text-sm">{po.po_number}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">

          {step === 'checking' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Closing this PO will mark it as complete. Ensure all goods are received and payment is settled.
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Closed By</label>
                <input value={closedBy} onChange={e => setClosedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
                <button onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                  {checkMutation.isPending ? 'Checking...' : 'Close PO'}
                </button>
              </div>
            </>
          )}

          {step === 'no_bill' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p className="font-medium">Cannot Close — No Supplier Bill</p>
                <p className="mt-1">Create a supplier bill from the GRN tab before closing this PO.</p>
              </div>
              <button onClick={onClose} className="w-full px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">OK</button>
            </>
          )}

          {step === 'override' && billInfo && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <p className="font-medium">Bill Payment Pending</p>
                <p className="mt-1">{billInfo.bill_number} — status: <strong>{billInfo.bill_status}</strong></p>
                <p className="mt-1">Provide a reason to close PO with unpaid bill.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Override Reason <span className="text-red-500">*</span></label>
                <select value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2">
                  <option value="">Select reason...</option>
                  {overrideOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {overrideReason === 'Other' && (
                  <textarea value={closureNotes} onChange={e => setClosureNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    rows={2} placeholder="Specify reason..." />
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
                <button onClick={() => overrideMutation.mutate()}
                  disabled={!overrideReason || overrideMutation.isPending}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                  {overrideMutation.isPending ? 'Closing...' : 'Close with Override'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

const ReverseGRNModal: React.FC<{ grn: any; onClose: () => void }> = ({ grn, onClose }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post(`/api/grn/${grn.id}/reverse`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['grns'] }); queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); onClose(); },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to reverse GRN')
  });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Reverse GRN</h2><p className="text-text-secondary text-sm">{grn.grn_number}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            This will reverse all stock entries and revert PO status. Cannot be undone if bill is already processed.
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Reversal Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={3} placeholder="Reason for reversal..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              {mutation.isPending ? 'Reversing...' : 'Reverse GRN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Purchase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [poSubTab, setPoSubTab] = useState('active');
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [viewPOId, setViewPOId] = useState<string | null>(null);
  const [cancelPO, setCancelPO] = useState<any>(null);
  const [amendPO, setAmendPO] = useState<any>(null);
  const [reverseGRN, setReverseGRN] = useState<any>(null);
  const [viewGRNId, setViewGRNId] = useState<string | null>(null);
  const [closePOModal, setClosePOModal] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: pos, isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.get('/api/purchase').then(r => r.data.data)
  });

  const { data: grns } = useQuery({
    queryKey: ['grns'],
    queryFn: () => api.get('/api/grn').then(r => r.data.data)
  });



  // Only show latest revisions
  const latestPos = pos?.filter((p: any) => p.is_latest_revision) || [];

  const summary = {
    total: latestPos.length,
    pending: latestPos.filter((p: any) => p.status === 'draft').length,
    active: latestPos.filter((p: any) => p.status === 'approved' || p.status === 'sent' || p.status === 'partial_received').length,
    received: latestPos.filter((p: any) => p.status === 'received').length,
    cancelled: latestPos.filter((p: any) => p.status === 'cancelled').length,
    closed: latestPos.filter((p: any) => p.status === 'closed').length,
  };

  const filteredPos = latestPos.filter((p: any) => {
    if (poSubTab === 'active') return p.status === 'approved' || p.status === 'sent' || p.status === 'partial_received';
    if (poSubTab === 'pending') return p.status === 'draft';
    if (poSubTab === 'received') return p.status === 'received';
    if (poSubTab === 'cancelled') return p.status === 'cancelled';
    if (poSubTab === 'closed') return p.status === 'closed';
    return true;
  });

  const poSubTabs = [
    { key: 'active', label: 'Active', count: summary.active, color: 'text-blue-600' },
    { key: 'pending', label: 'Pending Approval', count: summary.pending, color: 'text-amber-600' },
    { key: 'received', label: 'Received', count: summary.received, color: 'text-green-600' },
    { key: 'cancelled', label: 'Cancelled', count: summary.cancelled, color: 'text-red-500' },
    { key: 'closed', label: 'Closed', count: summary.closed, color: 'text-gray-500' },
  ];

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="text-brand-primary font-medium animate-pulse">Loading purchase data...</div></div>;

  return (
    <div className="space-y-6">
      {showCreatePO && <CreatePOModal onClose={() => setShowCreatePO(false)} />}
      {selectedPO && <CreateGRNModal po={selectedPO} onClose={() => setSelectedPO(null)} />}
      {viewPOId && <PODetailModal poId={viewPOId} onClose={() => setViewPOId(null)} />}
      {cancelPO && <CancelPOModal po={cancelPO} onClose={() => setCancelPO(null)} />}
      {amendPO && <AmendPOModal po={amendPO} onClose={() => setAmendPO(null)} />}
      {reverseGRN && <ReverseGRNModal grn={reverseGRN} onClose={() => setReverseGRN(null)} />}
      {viewGRNId && <GRNDetailModal grnId={viewGRNId} onClose={() => setViewGRNId(null)} />}
      {closePOModal && <ClosePOModal po={closePOModal} onClose={() => setClosePOModal(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Purchase</h1>
          <p className="text-text-secondary text-sm mt-1">Purchase orders and goods receipt</p>
        </div>
        <button onClick={() => setShowCreatePO(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">+ New PO</button>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-brand-primary rounded-xl p-4 text-white col-span-1">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Total POs</p>
          <p className="text-3xl font-bold mt-1">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">{summary.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Received</p>
          <p className="text-2xl font-bold text-green-500 mt-1">{summary.received}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Cancelled</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{summary.cancelled}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-gray-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Closed</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">{summary.closed}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['po', 'grn'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-brand-primary text-white' : 'bg-white text-text-secondary hover:bg-surface border border-border'}`}>
            {tab === 'po' ? 'Purchase Orders' : 'GRN'}
          </button>
        ))}
      </div>

      {activeTab === 'po' && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-border">
            {poSubTabs.map(tab => (
              <button key={tab.key} onClick={() => setPoSubTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${poSubTab === tab.key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
                {tab.label}
                {tab.count > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-surface ${tab.color}`}>{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light">
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Number</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Date</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Expected</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Payment Terms</th>
                  <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                  <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPos.map((po: any, i: number) => (
                  <tr key={po.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3 font-medium text-brand-primary cursor-pointer hover:underline" onClick={() => setViewPOId(po.id)}>
                      {po.po_number}
                      {po.revision_number > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">Rev {po.revision_number}</span>}
                    </td>
                    <td className="px-4 py-3 text-text-primary">{po.supplier?.supplier_name}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{new Date(po.po_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{po.payment_terms || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={po.status} />
                      {po.po_lines?.some((l: any) => l.quantity_ordered > 0) && (
                        <div className="mt-1">
                          {po.po_lines.map((l: any) => {
                            const pct = Math.min(Math.round((l.quantity_received / l.quantity_ordered) * 100), 100);
                            return (
                              <div key={l.id} className="text-xs text-text-secondary">
                                <div className="flex justify-between mb-0.5">
                                  <span>{l.quantity_received}/{l.quantity_ordered}</span>
                                  <span>{pct}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div className={`h-1 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-300'}`} style={{width: `${pct}%`}}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {po.status === 'draft' && (
                          <button onClick={() => api.put(`/api/purchase/${po.id}/approve`, {}).then(() => queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }))}
                            className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">Approve</button>
                        )}
                        {(po.status === 'approved' || po.status === 'sent' || po.status === 'partial_received') && (
                          <>
                            <button onClick={() => setSelectedPO(po)} className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100">+ GRN</button>
                            {(po.status === 'approved' || po.status === 'sent') && <button onClick={() => setAmendPO(po)} className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded hover:bg-amber-100">Amend</button>}
                          </>
                        )}
                        {po.status === 'received' && (
                          <button onClick={() => setClosePOModal(po)}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Close PO</button>
                        )}
                        {po.status !== 'cancelled' && po.status !== 'closed' && (
                          <button onClick={() => setCancelPO(po)} className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPos.length === 0 && <div className="text-center py-12 text-text-secondary">No purchase orders in this category</div>}
          </div>
        </div>
      )}

      {activeTab === 'grn' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">GRN Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">PO Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Received Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Items</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Received By</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grns?.map((grn: any, i: number) => (
                <tr key={grn.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary cursor-pointer hover:underline" onClick={() => setViewGRNId(grn.id)}>
                    {grn.grn_number}
                    {(grn as any).is_reversed && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Reversed</span>}
                  </td>
                  <td className="px-4 py-3 text-brand-primary text-xs font-medium">{grn.po?.po_number || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(grn.received_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-xs">
                    {grn.grn_lines?.map((gl: any) => (
                      <div key={gl.id} className="mb-1">
                        <span className="text-text-primary font-medium">{gl.item?.item_name}</span>
                        <span className="text-green-600 ml-2">✓ {gl.accepted_qty || gl.quantity_received}</span>
                        {gl.rejected_qty > 0 && <span className="text-red-500 ml-2">✗ {gl.rejected_qty}</span>}
                        <span className="text-text-secondary ml-1">{gl.item?.unit_of_measure}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{grn.received_by || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {!(grn as any).is_reversed ? (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Reversed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!(grn as any).is_reversed && <CreateBillButton grnId={grn.id} />}
                      {!(grn as any).is_reversed && (
                        <button onClick={() => setReverseGRN(grn)}
                          className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100">Reverse</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {grns?.length === 0 && <div className="text-center py-12 text-text-secondary">No GRNs found</div>}
        </div>
      )}
    </div>
  );
};

export default Purchase;
