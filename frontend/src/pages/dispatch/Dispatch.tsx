import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const CreateSalesOrderModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    so_number: 'SO-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4),
    customer_id: '',
    customer_name: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    payment_terms: 'Net 30',
    notes: ''
  });
  const [lines, setLines] = useState([
    { item_id: '', quantity_ordered: '', unit_price: '' }
  ]);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/api/customers').then(r => r.data.data)
  });

  const { data: items } = useQuery({
    queryKey: ['fgItems'],
    queryFn: () => api.get('/api/items').then(r => r.data.data)
  });

  const addLine = () => setLines([...lines, { item_id: '', quantity_ordered: '', unit_price: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const totalValue = lines.reduce((sum, l) =>
    sum + (parseFloat(l.quantity_ordered || '0') * parseFloat(l.unit_price || '0')), 0);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/dispatch/sales-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers?.find((c: any) => c.id === form.customer_id);
    mutation.mutate({
      ...form,
      customer_name: customer?.customer_name || form.customer_name,
      order_date: new Date(form.order_date).toISOString(),
      delivery_date: form.delivery_date ? new Date(form.delivery_date).toISOString() : null,
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
          <h2 className="font-bold text-text-primary">Create Sales Order</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">SO Number</label>
              <input
                value={form.so_number}
                onChange={e => setForm({ ...form, so_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Customer</label>
              <select
                value={form.customer_id}
                onChange={e => setForm({ ...form, customer_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="">Select customer...</option>
                {customers?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.customer_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Order Date</label>
              <input
                type="date"
                value={form.order_date}
                onChange={e => setForm({ ...form, order_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Delivery Date</label>
              <input
                type="date"
                value={form.delivery_date}
                onChange={e => setForm({ ...form, delivery_date: e.target.value })}
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
              <button type="button" onClick={addLine} className="text-xs text-brand-primary font-medium">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center bg-surface p-2 rounded-lg">
                  <div className="col-span-2">
                    <select
                      value={line.item_id}
                      onChange={e => updateLine(i, 'item_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="">Select item...</option>
                      {items?.filter((it: any) => it.item_type === 'finished_goods').map((it: any) => (
                        <option key={it.id} value={it.id}>{it.item_name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    value={line.quantity_ordered}
                    onChange={e => updateLine(i, 'quantity_ordered', e.target.value)}
                    placeholder="Qty (pcs)"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={line.unit_price}
                      onChange={e => updateLine(i, 'unit_price', e.target.value)}
                      placeholder="Price ₹"
                      className="flex-1 px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
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

          {mutation.isError && <p className="text-red-500 text-sm">Failed to create sales order</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create Sales Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateDispatchModal: React.FC<{ so: any; onClose: () => void }> = ({ so, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    dispatch_number: 'DSP-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4),
    dispatch_date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    transporter_name: '',
    challan_number: '',
    eway_bill_number: '',
    dispatched_by: 'Dispatch Executive',
    lines: so.so_lines?.map((l: any) => ({
      so_line_id: l.id,
      item_id: l.item_id,
      item_name: l.item?.item_name || '',
      quantity_ordered: l.quantity_ordered,
      quantity_dispatched: ''
    })) || []
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/dispatch', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      onClose();
    }
  });

  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...form.lines];
    updated[i] = { ...updated[i], [field]: value };
    setForm({ ...form, lines: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      so_id: so.id,
      customer_id: so.customer_id,
      dispatch_date: new Date(form.dispatch_date).toISOString(),
      lines: form.lines.map((l: any) => ({
        ...l,
        quantity_dispatched: parseFloat(l.quantity_dispatched)
      }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Create Dispatch</h2>
            <p className="text-text-secondary text-sm">Against {so.so_number} — {so.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Dispatch Number</label>
              <input
                value={form.dispatch_number}
                onChange={e => setForm({ ...form, dispatch_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Dispatch Date</label>
              <input
                type="date"
                value={form.dispatch_date}
                onChange={e => setForm({ ...form, dispatch_date: e.target.value })}
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
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Transporter</label>
              <input
                value={form.transporter_name}
                onChange={e => setForm({ ...form, transporter_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Transporter name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Challan Number</label>
              <input
                value={form.challan_number}
                onChange={e => setForm({ ...form, challan_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="DC number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">E-Way Bill</label>
              <input
                value={form.eway_bill_number}
                onChange={e => setForm({ ...form, eway_bill_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="E-way bill number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Items to Dispatch</label>
            <div className="space-y-2">
              {form.lines.map((line: any, i: number) => (
                <div key={i} className="bg-surface p-3 rounded-lg">
                  <p className="text-sm font-medium text-text-primary mb-2">{line.item_name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-text-secondary">Ordered</label>
                      <p className="text-sm font-bold text-text-primary">{line.quantity_ordered} pcs</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary">Dispatching</label>
                      <input
                        type="number"
                        value={line.quantity_dispatched}
                        onChange={e => updateLine(i, 'quantity_dispatched', e.target.value)}
                        className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {mutation.isError && <p className="text-red-500 text-sm">Failed to create dispatch</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Dispatch: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [showCreateSO, setShowCreateSO] = useState(false);
  const [selectedSO, setSelectedSO] = useState<any>(null);

  const { data: salesOrders, isLoading } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => api.get('/api/dispatch/sales-orders').then(r => r.data.data)
  });

  const { data: dispatches } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => api.get('/api/dispatch').then(r => r.data.data)
  });

  const summary = {
    totalOrders: salesOrders?.length || 0,
    open: salesOrders?.filter((s: any) => s.status === 'open').length || 0,
    totalDispatches: dispatches?.length || 0,
    confirmed: dispatches?.filter((d: any) => d.status === 'confirmed').length || 0
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading dispatch data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {showCreateSO && <CreateSalesOrderModal onClose={() => setShowCreateSO(false)} />}
      {selectedSO && <CreateDispatchModal so={selectedSO} onClose={() => setSelectedSO(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Dispatch</h1>
          <p className="text-text-secondary text-sm mt-1">Sales orders and outbound shipments</p>
        </div>
        <button
          onClick={() => setShowCreateSO(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
        >
          + New Sales Order
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Sales Orders</p>
          <p className="text-3xl font-bold mt-1">{summary.totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Open Orders</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{summary.open}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Dispatches</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{summary.totalDispatches}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Confirmed</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{summary.confirmed}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['orders', 'dispatches'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {tab === 'orders' ? 'Sales Orders' : 'Dispatches'}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">SO Number</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Order Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Delivery Date</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders?.map((so: any, i: number) => (
                <tr key={so.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{so.so_number}</td>
                  <td className="px-4 py-3 text-text-primary">{so.customer_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(so.order_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {so.delivery_date ? new Date(so.delivery_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      so.status === 'open' ? 'bg-amber-50 text-amber-600' :
                      so.status === 'closed' ? 'bg-green-50 text-green-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>{so.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {so.status === 'open' && (
                      <button
                        onClick={() => setSelectedSO(so)}
                        className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100"
                      >
                        + Dispatch
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {salesOrders?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No sales orders found</div>
          )}
        </div>
      )}

      {activeTab === 'dispatches' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Dispatch No</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Dispatch Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Vehicle</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Challan</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">E-Way Bill</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {dispatches?.map((d: any, i: number) => (
                <tr key={d.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{d.dispatch_number}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(d.dispatch_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{d.vehicle_number || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{d.challan_number || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{d.eway_bill_number || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
                    }`}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dispatches?.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No dispatches found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dispatch;
