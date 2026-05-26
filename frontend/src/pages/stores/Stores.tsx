import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const ZoneBadge: React.FC<{ zone: string }> = ({ zone }) => {
  const colors: any = {
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[zone] || 'bg-gray-50 text-gray-500'}`}>
      {zone?.toUpperCase()}
    </span>
  );
};

const TransactionBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: any = {
    receipt: 'bg-green-50 text-green-600',
    issue: 'bg-red-50 text-red-600',
    dispatch: 'bg-blue-50 text-blue-600',
    grn_reversal: 'bg-amber-50 text-amber-600',
    adjustment: 'bg-purple-50 text-purple-600',
    sent_to_vendor: 'bg-orange-50 text-orange-600',
    received_from_vendor: 'bg-teal-50 text-teal-600'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[type] || 'bg-gray-50 text-gray-500'}`}>
      {type?.replace(/_/g, ' ')}
    </span>
  );
};

const IssueMaterialModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    job_id: '',
    item_id: '',
    planned_qty: '',
    issued_qty: '',
    issued_by: 'Storekeeper'
  });

  const { data: jobs } = useQuery({ queryKey: ['jobcards'], queryFn: () => api.get('/api/jobcards').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const { data: stock } = useQuery({ queryKey: ['stock'], queryFn: () => api.get('/api/stock').then(r => r.data.data) });

  const selectedItemStock = stock?.find((s: any) => s.item_id === form.item_id);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/stock/issue', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock'] }); queryClient.invalidateQueries({ queryKey: ['stockMovements'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, planned_qty: parseFloat(form.planned_qty), issued_qty: parseFloat(form.issued_qty) });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Issue Material</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
            {selectedItemStock && (
              <p className={`text-xs mt-1 ${selectedItemStock.zone === 'red' ? 'text-red-500' : selectedItemStock.zone === 'yellow' ? 'text-amber-500' : 'text-green-600'}`}>
                Available: {selectedItemStock.quantity_on_hand?.toLocaleString('en-IN')} {selectedItemStock.unit_of_measure}
              </p>
            )}
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
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary ${selectedItemStock && parseFloat(form.issued_qty) > selectedItemStock.quantity_on_hand ? 'border-red-400 bg-red-50' : 'border-border'}`} required />
              {selectedItemStock && parseFloat(form.issued_qty) > selectedItemStock.quantity_on_hand && (
                <p className="text-xs text-red-500 mt-0.5">⚠ Exceeds available stock</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Issued By</label>
            <input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to issue material</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Issuing...' : 'Issue Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StockAdjustmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    item_id: '',
    physical_count: '',
    adjustment_reason: '',
    adjusted_by: 'Storekeeper'
  });
  const [preview, setPreview] = useState<any>(null);

  const { data: stock } = useQuery({ queryKey: ['stock'], queryFn: () => api.get('/api/stock').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });

  const selectedStock = stock?.find((s: any) => s.item_id === form.item_id);

  const adjustmentReasons = [
    'Physical count variance',
    'Damaged material — write off',
    'Expired material — write off',
    'Found stock — write up',
    'Counting error correction',
    'Spillage / wastage',
    'Other'
  ];

  const handleItemChange = (item_id: string) => {
    setForm({ ...form, item_id });
    setPreview(null);
  };

  const handleCountChange = (physical_count: string) => {
    setForm({ ...form, physical_count });
    if (selectedStock && physical_count) {
      const variance = parseFloat(physical_count) - selectedStock.quantity_on_hand;
      setPreview({
        system_qty: selectedStock.quantity_on_hand,
        physical_count: parseFloat(physical_count),
        variance,
        type: variance > 0 ? 'write_up' : variance < 0 ? 'write_off' : 'no_change'
      });
    }
  };

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/stock/adjust', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      alert(`✓ Adjustment ${res.data.data.adj_number} created. Variance: ${res.data.data.variance > 0 ? '+' : ''}${res.data.data.variance} ${selectedStock?.unit_of_measure}`);
      onClose();
    },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to adjust stock')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || preview.type === 'no_change') return;
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Stock Adjustment</h2>
            <p className="text-text-secondary text-sm">Physical count entry</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Item <span className="text-red-500">*</span></label>
            <select value={form.item_id} onChange={e => handleItemChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
              <option value="">Select item...</option>
              {items?.map((i: any) => <option key={i.id} value={i.id}>{i.item_name} ({i.item_code})</option>)}
            </select>
            {selectedStock && (
              <p className="text-xs text-text-secondary mt-1">System stock: <strong>{selectedStock.quantity_on_hand?.toLocaleString('en-IN')} {selectedStock.unit_of_measure}</strong></p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Physical Count <span className="text-red-500">*</span></label>
            <input type="number" value={form.physical_count} onChange={e => handleCountChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Enter actual counted quantity" required />
          </div>

          {preview && preview.type !== 'no_change' && (
            <div className={`rounded-lg p-3 text-sm border ${preview.type === 'write_up' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-medium ${preview.type === 'write_up' ? 'text-green-700' : 'text-red-700'}`}>
                {preview.type === 'write_up' ? '📈 Write Up' : '📉 Write Off'}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div><p className="text-text-secondary">System</p><p className="font-bold">{preview.system_qty?.toLocaleString('en-IN')}</p></div>
                <div><p className="text-text-secondary">Physical</p><p className="font-bold">{preview.physical_count?.toLocaleString('en-IN')}</p></div>
                <div><p className="text-text-secondary">Variance</p><p className={`font-bold ${preview.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>{preview.variance > 0 ? '+' : ''}{preview.variance?.toLocaleString('en-IN')}</p></div>
              </div>
            </div>
          )}

          {preview?.type === 'no_change' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              ✓ Physical count matches system stock — no adjustment needed
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Reason <span className="text-red-500">*</span></label>
            <select value={form.adjustment_reason} onChange={e => setForm({ ...form, adjustment_reason: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
              <option value="">Select reason...</option>
              {adjustmentReasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Adjusted By</label>
            <input value={form.adjusted_by} onChange={e => setForm({ ...form, adjusted_by: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={!preview || preview.type === 'no_change' || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GRNDetailContent: React.FC<{ grnId: string }> = ({ grnId }) => {
  const { data: grnData, isLoading } = useQuery({
    queryKey: ['grn', grnId],
    queryFn: () => api.get(`/api/grn/${grnId}`).then(r => r.data.data)
  });

  if (isLoading) return <div className="p-8 text-center text-brand-primary animate-pulse">Loading...</div>;
  if (!grnData) return <div className="p-8 text-center text-text-secondary">GRN not found</div>;

  const subtotal = grnData.grn_lines?.reduce((s: number, l: any) => s + (l.accepted_qty || l.quantity_received) * (l.unit_price || 0), 0) || 0;

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">PO Number</p><p className="font-medium text-brand-primary">{grnData.po?.po_number || '—'}</p></div>
        <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Received Date</p><p className="font-medium">{new Date(grnData.received_date).toLocaleDateString('en-IN')}</p></div>
        <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Supplier</p><p className="font-medium">{grnData.po?.supplier?.supplier_name || '—'}</p></div>
        <div className="bg-surface rounded-lg p-3"><p className="text-xs text-text-secondary">Vehicle</p><p className="font-medium">{grnData.vehicle_number || '—'}</p></div>
      </div>

      {grnData.is_reversed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <p className="font-medium">GRN Reversed</p>
          <p className="text-xs mt-1">Reason: {grnData.reversal_reason}</p>
        </div>
      )}

      <table className="w-full text-sm">
        <thead><tr className="bg-brand-light">
          <th className="text-left px-3 py-2 text-brand-primary">#</th>
          <th className="text-left px-3 py-2 text-brand-primary">Item</th>
          <th className="text-right px-3 py-2 text-brand-primary">Received</th>
          <th className="text-right px-3 py-2 text-green-600">Accepted</th>
          <th className="text-right px-3 py-2 text-red-500">Rejected</th>
          <th className="text-right px-3 py-2 text-brand-primary">Unit Price</th>
          <th className="text-right px-3 py-2 text-brand-primary">Amount</th>
          <th className="text-left px-3 py-2 text-brand-primary">Batch</th>
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
              <td className="px-3 py-2 text-xs text-text-secondary">{line.batch_number || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-brand-light">
            <td colSpan={6} className="px-3 py-2 text-right font-bold">Total</td>
            <td className="px-3 py-2 text-right font-bold text-brand-primary">₹{subtotal.toLocaleString('en-IN')}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const DispositionActions: React.FC<{ quarantineId: string }> = ({ quarantineId }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [disposition, setDisposition] = useState('');
  const [notes, setNotes] = useState('');
  const [disposedBy, setDisposedBy] = useState('Storekeeper');

  const dispositionOptions = [
    { value: 'return_to_supplier', label: '↩ Return to Supplier' },
    { value: 'scrapped', label: '🗑 Scrap' },
    { value: 'rework', label: '🔧 Rework' },
    { value: 'use_as_is', label: '✓ Use As Is (Deviation)' }
  ];

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/quarantine/${quarantineId}/dispose`, { disposition, disposed_by: disposedBy, disposition_notes: notes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quarantine'] }); queryClient.invalidateQueries({ queryKey: ['stock'] }); setShowForm(false); },
    onError: (err: any) => alert(err.response?.data?.error || 'Failed to dispose')
  });

  if (!showForm) return (
    <button onClick={() => setShowForm(true)} className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100">
      Dispose
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-text-primary text-sm">Dispose Quarantine Stock</h3>
          <button onClick={() => setShowForm(false)} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Disposition <span className="text-red-500">*</span></label>
            <select value={disposition} onChange={e => setDisposition(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
              <option value="">Select...</option>
              {dispositionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {disposition === 'use_as_is' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
              ⚠ This will add the rejected qty back to main stock with a deviation note.
            </div>
          )}
          {disposition === 'return_to_supplier' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
              ℹ Raise a Debit Note in Finance module against the supplier bill.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Optional notes..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Disposed By</label>
            <input value={disposedBy} onChange={e => setDisposedBy(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 border border-border rounded-lg text-xs text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!disposition || mutation.isPending}
              className="flex-1 px-3 py-2 bg-brand-primary text-white rounded-lg text-xs font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? '...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const Stores: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [viewGRNId, setViewGRNId] = useState<string | null>(null);
  const [viewGRNNumber, setViewGRNNumber] = useState<string>('');
  const [filterItem, setFilterItem] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/api/stock').then(r => r.data.data),
    refetchInterval: 60000
  });

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });

  const movementsQuery = `${filterItem ? `item_id=${filterItem}&` : ''}${filterType ? `transaction_type=${filterType}&` : ''}${filterFrom ? `from_date=${filterFrom}&` : ''}${filterTo ? `to_date=${filterTo}` : ''}`;

  const { data: quarantineData } = useQuery({
    queryKey: ['quarantine'],
    queryFn: () => api.get('/api/quarantine').then(r => r.data),
    enabled: activeTab === 'quarantine'
  });

  const quarantine = quarantineData?.data || [];
  const quarantineSummary = quarantineData?.summary || {};

  const { data: movements } = useQuery({
    queryKey: ['stockMovements', filterItem, filterType, filterFrom, filterTo],
    queryFn: () => api.get(`/api/stock/movements?${movementsQuery}`).then(r => r.data.data),
    enabled: activeTab === 'movements'
  });

  const redItems = stock?.filter((s: any) => s.zone === 'red') || [];
  const yellowItems = stock?.filter((s: any) => s.zone === 'yellow') || [];
  const totalValue = stock?.reduce((s: number, item: any) => s + (item.quantity_on_hand * (item.unit_cost || 0)), 0) || 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading stock data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {showIssueModal && <IssueMaterialModal onClose={() => setShowIssueModal(false)} />}
      {showAdjustModal && <StockAdjustmentModal onClose={() => setShowAdjustModal(false)} />}
      {viewGRNId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-bold text-text-primary">{viewGRNNumber}</h2>
                <p className="text-text-secondary text-sm">Goods Receipt Note</p>
              </div>
              <button onClick={() => setViewGRNId(null)} className="text-text-secondary hover:text-text-primary text-xl">✕</button>
            </div>
            <GRNDetailContent grnId={viewGRNId} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Stores</h1>
          <p className="text-text-secondary text-sm mt-1">Stock balance and material movements</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdjustModal(true)}
            className="bg-white border border-border text-text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface transition-colors">
            ⚖ Stock Adjustment
          </button>
          <button onClick={() => setShowIssueModal(true)}
            className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
            + Issue Material
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Total Items</p>
          <p className="text-3xl font-bold mt-1">{stock?.length || 0}</p>
          <p className="text-blue-200 text-xs mt-1">In system</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Healthy</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{stock?.filter((s: any) => s.zone === 'green').length || 0}</p>
          <p className="text-text-secondary text-xs mt-1">Green zone</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Reorder</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{yellowItems.length}</p>
          <p className="text-text-secondary text-xs mt-1">Yellow zone</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Critical</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{redItems.length}</p>
          <p className="text-text-secondary text-xs mt-1">Red zone</p>
        </div>
      </div>

      {redItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-700 mb-2 text-sm">⚠ Critical Stock — Immediate Action Required</h3>
          <div className="space-y-1">
            {redItems.map((item: any) => (
              <div key={item.item_id} className="flex justify-between text-sm">
                <span className="text-red-600">{item.item_name} <span className="text-red-400 text-xs">({item.item_code})</span></span>
                <span className="font-bold text-red-700">{item.quantity_on_hand?.toLocaleString('en-IN')} {item.unit_of_measure} — below safety stock of {item.safety_stock?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['stock', 'movements', 'quarantine'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-brand-primary text-white' : 'bg-white text-text-secondary hover:bg-surface border border-border'}`}>
            {tab === 'quarantine' ? `Quarantine ${quarantineSummary?.pending > 0 ? '(' + quarantineSummary.pending + ')' : ''}` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Location</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">On Hand</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Safety Stock</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Reorder Point</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Zone</th>
              </tr>
            </thead>
            <tbody>
              {stock?.map((item: any, i: number) => (
                <tr key={item.item_id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'} ${item.zone === 'red' ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{item.item_name}</p>
                    <p className="text-text-secondary text-xs">{item.item_code}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs capitalize">{item.item_type?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{item.storage_location || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${item.zone === 'red' ? 'text-red-500' : item.zone === 'yellow' ? 'text-amber-500' : 'text-green-600'}`}>
                      {item.quantity_on_hand?.toLocaleString('en-IN')} {item.unit_of_measure}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">{item.safety_stock?.toLocaleString('en-IN') || '—'}</td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">{item.reorder_point?.toLocaleString('en-IN') || '—'}</td>
                  <td className="px-4 py-3 text-center"><ZoneBadge zone={item.zone} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {stock?.length === 0 && <div className="text-center py-12 text-text-secondary">No stock data found</div>}
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Filter by Item</label>
                <select value={filterItem} onChange={e => setFilterItem(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="">All Items</option>
                  {items?.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Transaction Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="">All Types</option>
                  <option value="receipt">Receipt</option>
                  <option value="issue">Issue</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="grn_reversal">GRN Reversal</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">From Date</label>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">To Date</label>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
              </div>
            </div>
            {(filterItem || filterType || filterFrom || filterTo) && (
              <button onClick={() => { setFilterItem(''); setFilterType(''); setFilterFrom(''); setFilterTo(''); }}
                className="mt-2 text-xs text-brand-primary hover:text-brand-dark">Clear filters</button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light">
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Date & Time</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Reference</th>
                  <th className="text-right px-4 py-3 text-brand-primary font-medium">Quantity</th>
                  {filterItem && <th className="text-right px-4 py-3 text-brand-primary font-medium">Balance</th>}
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Batch</th>
                </tr>
              </thead>
              <tbody>
                {movements?.map((m: any, i: number) => (
                  <tr key={m.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      <p>{new Date(m.transacted_at).toLocaleDateString('en-IN')}</p>
                      <p>{new Date(m.transacted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary text-xs">{m.item_name}</p>
                      <p className="text-text-secondary text-xs">{m.item_code}</p>
                    </td>
                    <td className="px-4 py-3"><TransactionBadge type={m.transaction_type} /></td>
                    <td className="px-4 py-3 text-xs">
                      {m.transaction_type === 'receipt' || m.transaction_type === 'grn_reversal' ? (
                        <p className="font-medium text-brand-primary cursor-pointer hover:underline"
                          onClick={() => { setViewGRNId(m.reference_id); setViewGRNNumber(m.reference_number); }}>
                          {m.reference_number}
                        </p>
                      ) : (
                        <p className="font-medium text-brand-primary">{m.reference_number}</p>
                      )}
                      <p className="text-text-secondary">{m.reference_display}</p>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity?.toLocaleString('en-IN')} {m.unit_of_measure}
                    </td>
                    {filterItem && <td className="px-4 py-3 text-right text-text-secondary text-xs font-medium">{m.running_balance?.toLocaleString('en-IN')}</td>}
                    <td className="px-4 py-3 text-text-secondary text-xs">{m.batch_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movements?.length === 0 && <div className="text-center py-12 text-text-secondary">No movements found</div>}
          </div>
        </div>
      )}
      {activeTab === 'quarantine' && (
        <div className="space-y-4">
          {quarantineSummary?.pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-700 text-sm">⚠ {quarantineSummary.pending} items pending disposition — total {quarantineSummary.total_qty?.toLocaleString('en-IN')} units in quarantine</p>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-light">
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">GRN</th>
                  <th className="text-right px-4 py-3 text-brand-primary font-medium">Qty</th>
                  <th className="text-left px-4 py-3 text-brand-primary font-medium">Rejection Reason</th>
                  <th className="text-center px-4 py-3 text-brand-primary font-medium">Disposition</th>
                  <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quarantine.map((q: any, i: number) => (
                  <tr key={q.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{q.item?.item_name}</p>
                      <p className="text-text-secondary text-xs">{q.item?.item_code}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-primary text-xs font-medium">{q.grn_number}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{q.quantity?.toLocaleString('en-IN')} {q.item?.unit_of_measure}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{q.rejection_reason || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {q.disposition === 'pending' ? (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">Pending</span>
                      ) : (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200 capitalize">{q.disposition?.replace(/_/g, ' ')}</span>
                      )}
                      {q.disposition !== 'pending' && q.disposed_at && (
                        <p className="text-xs text-text-secondary mt-0.5">{new Date(q.disposed_at).toLocaleDateString('en-IN')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {q.disposition === 'pending' && (
                        <DispositionActions quarantineId={q.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {quarantine.length === 0 && <div className="text-center py-12 text-text-secondary">No quarantine stock</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;
