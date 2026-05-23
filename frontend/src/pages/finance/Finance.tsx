import React, { useState } from 'react';
import { printInvoice } from '../../utils/invoice.pdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: any = {
    draft: 'bg-gray-50 text-gray-600',
    sent: 'bg-blue-50 text-blue-600',
    paid: 'bg-green-50 text-green-600',
    partial: 'bg-amber-50 text-amber-600',
    overdue: 'bg-red-50 text-red-600',
    reversed: 'bg-gray-100 text-gray-400',
    pending: 'bg-amber-50 text-amber-600',
    received: 'bg-green-50 text-green-600'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
      {status}
    </span>
  );
};

const CreateInvoiceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    customer_id: '',
    is_inter_state: false,
    payment_terms: 'Net 30'
  });
  const [lines, setLines] = useState([{ item_id: '', item_name: '', hsn_code: '', quantity: '', unit_price: '', tax_rate: '18' }]);

  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/api/customers').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['fgItems'], queryFn: () => api.get('/api/items').then(r => r.data.data) });

  const addLine = () => setLines([...lines, { item_id: '', item_name: '', hsn_code: '', quantity: '', unit_price: '', tax_rate: '18' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines];
    if (field === 'item_id') {
      const item = items?.find((it: any) => it.id === value);
      updated[i] = { ...updated[i], item_id: value, item_name: item?.item_name || '', unit_price: item?.selling_price?.toString() || '' };
    } else {
      updated[i] = { ...updated[i], [field]: value };
    }
    setLines(updated);
  };

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity || '0') * parseFloat(l.unit_price || '0')), 0);
  const tax = lines.reduce((s, l) => {
    const amt = parseFloat(l.quantity || '0') * parseFloat(l.unit_price || '0');
    return s + amt * parseFloat(l.tax_rate || '18') / 100;
  }, 0);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/finance/invoices', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers?.find((c: any) => c.id === form.customer_id);
    mutation.mutate({
      ...form,
      invoice_date: new Date(form.invoice_date).toISOString(),
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      customer_name: customer?.customer_name || '',
      customer_gstin: customer?.gstin || '',
      lines: lines.map(l => ({ ...l, quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price), tax_rate: parseFloat(l.tax_rate) }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Create Invoice</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Customer</label>
              <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required>
                <option value="">Select customer...</option>
                {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Invoice Date</label>
              <input type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Terms</label>
              <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="interstate" checked={form.is_inter_state} onChange={e => setForm({ ...form, is_inter_state: e.target.checked })} />
            <label htmlFor="interstate" className="text-sm text-text-primary">Inter-state supply (IGST applies)</label>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Line Items</label>
              <button type="button" onClick={addLine} className="text-xs text-brand-primary font-medium">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center bg-surface p-2 rounded-lg">
                  <div className="col-span-2">
                    <select value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                      <option value="">Select item...</option>
                      {items?.filter((it: any) => it.item_type === 'finished_goods').map((it: any) => <option key={it.id} value={it.id}>{it.item_name}</option>)}
                    </select>
                  </div>
                  <input value={line.hsn_code} onChange={e => updateLine(i, 'hsn_code', e.target.value)} placeholder="HSN"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  <input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} placeholder="Qty"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  <input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} placeholder="Price ₹"
                    className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  <div className="flex items-center gap-1">
                    <select value={line.tax_rate} onChange={e => updateLine(i, 'tax_rate', e.target.value)}
                      className="flex-1 px-1 py-1.5 border border-border rounded text-xs focus:outline-none">
                      <option value="18">18%</option><option value="12">12%</option><option value="5">5%</option><option value="0">0%</option>
                    </select>
                    {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 text-xs">✕</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 space-y-1 text-sm">
              <div className="text-right space-y-1">
                <p className="text-text-secondary">Subtotal: <span className="font-medium text-text-primary">{fmt(subtotal)}</span></p>
                <p className="text-text-secondary">Tax ({form.is_inter_state ? 'IGST' : 'CGST+SGST'}): <span className="font-medium text-text-primary">{fmt(tax)}</span></p>
                <p className="font-bold text-text-primary">Total: {fmt(subtotal + tax)}</p>
              </div>
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to create invoice</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RecordPaymentModal: React.FC<{ invoice: any; onClose: () => void }> = ({ invoice, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    amount_received: invoice.total_amount - invoice.amount_paid,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'bank',
    reference_number: '',
    bank_account_id: '',
    notes: ''
  });

  const { data: bankAccounts } = useQuery({ queryKey: ['bankAccounts'], queryFn: () => api.get('/api/finance/bank-accounts').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/finance/receipts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, invoice_id: invoice.id, payment_date: new Date(form.payment_date).toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Record Payment</h2>
            <p className="text-text-secondary text-sm">{invoice.invoice_number} — {invoice.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-brand-light rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Invoice Total</span>
              <span className="font-bold">{fmt(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-secondary">Already Paid</span>
              <span className="text-green-600">{fmt(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1 pt-1 border-t border-blue-200">
              <span className="font-medium text-text-primary">Outstanding</span>
              <span className="font-bold text-brand-primary">{fmt(invoice.total_amount - invoice.amount_paid)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Amount Received</label>
              <input type="number" value={form.amount_received} onChange={e => setForm({ ...form, amount_received: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Date</label>
              <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="bank">Bank Transfer</option>
                <option value="neft">NEFT</option>
                <option value="rtgs">RTGS</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Bank Account</label>
              <select value={form.bank_account_id} onChange={e => setForm({ ...form, bank_account_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select account...</option>
                {bankAccounts?.map((a: any) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Reference / UTR Number</label>
            <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="UTR / Cheque number" />
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to record payment</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50">
              {mutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddExpenseModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'salary',
    description: '',
    amount: '',
    payment_mode: 'bank',
    bank_account_id: '',
    reference_number: ''
  });

  const { data: bankAccounts } = useQuery({ queryKey: ['bankAccounts'], queryFn: () => api.get('/api/finance/bank-accounts').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/finance/expenses', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, amount: parseFloat(form.amount), expense_date: new Date(form.expense_date).toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Expense</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
              <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="salary">Salaries</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="e.g. May 2026 salaries" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Bank Account</label>
              <select value={form.bank_account_id} onChange={e => setForm({ ...form, bank_account_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select account...</option>
                {bankAccounts?.map((a: any) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Reference</label>
              <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Optional" />
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add expense</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const PayBillModal: React.FC<{ bill: any; onClose: () => void }> = ({ bill, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    amount_paid: bill.total_amount - bill.amount_paid,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'bank',
    reference_number: '',
    bank_account_id: '',
    notes: ''
  });

  const { data: bankAccounts } = useQuery({ queryKey: ['bankAccounts'], queryFn: () => api.get('/api/finance/bank-accounts').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/finance/vouchers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supplierBills'] }); onClose(); }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, bill_id: bill.id, payment_date: new Date(form.payment_date).toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Pay Supplier Bill</h2>
            <p className="text-text-secondary text-sm">{bill.bill_number} — {bill.supplier_name}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-surface rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Bill Total</span>
              <span className="font-bold">{fmt(bill.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-secondary">Already Paid</span>
              <span className="text-green-600">{fmt(bill.amount_paid)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1 pt-1 border-t border-border">
              <span className="font-medium">Outstanding</span>
              <span className="font-bold text-red-500">{fmt(bill.total_amount - bill.amount_paid)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Amount Paying</label>
              <input type="number" value={form.amount_paid} onChange={e => setForm({ ...form, amount_paid: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Date</label>
              <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="bank">Bank Transfer</option>
                <option value="neft">NEFT</option>
                <option value="rtgs">RTGS</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Bank Account</label>
              <select value={form.bank_account_id} onChange={e => setForm({ ...form, bank_account_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select account...</option>
                {bankAccounts?.map((a: any) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Reference / UTR</label>
            <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="UTR / Cheque number" />
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to record payment</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Paying...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const PrintInvoiceButton: React.FC<{ invoice: any }> = ({ invoice }) => {
  const { data: company } = useQuery({ queryKey: ['companyConfig'], queryFn: () => api.get('/api/finance/config').then(r => r.data.data) });
  const { data: fullInvoice } = useQuery({
    queryKey: ['invoice', invoice.id],
    queryFn: () => api.get(`/api/finance/invoices/${invoice.id}`).then(r => r.data.data),
    enabled: false
  });

  const handlePrint = async () => {
    const res = await api.get(`/api/finance/invoices/${invoice.id}`);
    printInvoice(res.data.data, company);
  };

  return (
    <button onClick={handlePrint} className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100">
      🖨 PDF
    </button>
  );
};

const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/api/finance/invoices').then(r => r.data.data) });
  const { data: bills } = useQuery({ queryKey: ['supplierBills'], queryFn: () => api.get('/api/finance/bills').then(r => r.data.data) });
  const { data: expenses } = useQuery({ queryKey: ['expenses'], queryFn: () => api.get('/api/finance/expenses').then(r => r.data.data) });
  const { data: cashPosition } = useQuery({ queryKey: ['cashPosition'], queryFn: () => api.get('/api/finance/reports/cash-position').then(r => r.data.data) });
  const { data: pl } = useQuery({ queryKey: ['pl'], queryFn: () => api.get('/api/finance/reports/pl').then(r => r.data.data) });
  const { data: customerAging } = useQuery({ queryKey: ['customerAging'], queryFn: () => api.get('/api/finance/reports/customer-aging').then(r => r.data.data) });
  const { data: gst } = useQuery({ queryKey: ['gstSummary'], queryFn: () => api.get('/api/finance/reports/gst').then(r => r.data.data) });

  const tabs = [
    { id: 'invoices', label: 'Invoices' },
    { id: 'bills', label: 'Supplier Bills' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'cashposition', label: 'Cash Position' },
    { id: 'pl', label: 'P&L' },
    { id: 'aging', label: 'Aging' },
    { id: 'gst', label: 'GST' }
  ];

  return (
    <div className="space-y-6">
      {showCreateInvoice && <CreateInvoiceModal onClose={() => setShowCreateInvoice(false)} />}
      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} />}
      {selectedInvoice && <RecordPaymentModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
      {selectedBill && <PayBillModal bill={selectedBill} onClose={() => setSelectedBill(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Finance</h1>
          <p className="text-text-secondary text-sm mt-1">Invoices, payments, expenses and GST</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'invoices' && (
            <button onClick={() => setShowCreateInvoice(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
              + New Invoice
            </button>
          )}
          {activeTab === 'expenses' && (
            <button onClick={() => setShowAddExpense(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
              + Add Expense
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-primary rounded-xl p-4 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Bank Balance</p>
          <p className="text-2xl font-bold mt-1">{fmt(cashPosition?.bank_balance)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Receivables (30d)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(cashPosition?.receivables_due_30_days)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Payables (30d)</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{fmt(cashPosition?.payables_due_30_days)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-brand-primary">
          <p className="text-text-secondary text-xs uppercase tracking-wider">Net Profit (MTD)</p>
          <p className={`text-2xl font-bold mt-1 ${(pl?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmt(pl?.net_profit)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-brand-primary text-white' : 'bg-white text-text-secondary hover:bg-surface border border-border'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Invoice No</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Due Date</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Amount</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Paid</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((inv: any, i: number) => (
                <tr key={inv.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-text-primary">{inv.customer_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-text-primary">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(inv.amount_paid)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {['draft', 'sent', 'partial', 'overdue'].includes(inv.status) && (
                        <button onClick={() => setSelectedInvoice(inv)}
                          className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">
                          + Payment
                        </button>
                      )}
                      <PrintInvoiceButton invoice={inv} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices?.length === 0 && <div className="text-center py-12 text-text-secondary">No invoices found</div>}
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Bill No</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Date</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Amount</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Paid</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Status</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {bills?.map((bill: any, i: number) => (
                <tr key={bill.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{bill.bill_number}</td>
                  <td className="px-4 py-3 text-text-primary">{bill.supplier_name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(bill.bill_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(bill.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(bill.amount_paid)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={bill.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {['pending', 'partial'].includes(bill.status) && (
                      <button onClick={() => setSelectedBill(bill)} className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100">+ Pay</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bills?.length === 0 && <div className="text-center py-12 text-text-secondary">No bills found</div>}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Exp No</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Date</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Category</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Description</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Mode</th>
              </tr>
            </thead>
            <tbody>
              {expenses?.map((exp: any, i: number) => (
                <tr key={exp.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3 font-medium text-brand-primary">{exp.expense_number}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(exp.expense_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-brand-light text-brand-primary px-2 py-0.5 rounded-full">{exp.category}</span></td>
                  <td className="px-4 py-3 text-text-primary">{exp.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-500">{fmt(exp.amount)}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{exp.payment_mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses?.length === 0 && <div className="text-center py-12 text-text-secondary">No expenses found</div>}
        </div>
      )}

      {activeTab === 'cashposition' && cashPosition && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-4">Bank Accounts</h3>
            {cashPosition.bank_accounts?.map((acc: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{acc.account_name}</p>
                  <p className="text-xs text-text-secondary">{acc.bank_name}</p>
                </div>
                <p className="font-bold text-text-primary">{fmt(acc.balance)}</p>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-1">
              <p className="font-bold text-text-primary">Total Bank Balance</p>
              <p className="font-bold text-brand-primary text-lg">{fmt(cashPosition.bank_balance)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-4">30-Day Projection</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Current Balance</span>
                <span className="font-medium">{fmt(cashPosition.bank_balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">+ Receivables Due</span>
                <span className="font-medium text-green-600">+{fmt(cashPosition.receivables_due_30_days)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">- Payables Due</span>
                <span className="font-medium text-red-500">-{fmt(cashPosition.payables_due_30_days)}</span>
              </div>
              {cashPosition.overdue_receivables > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Overdue Receivables</span>
                  <span className="font-bold">{fmt(cashPosition.overdue_receivables)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-bold text-text-primary">Projected Cash (30d)</span>
                <span className={`font-bold text-lg ${cashPosition.projected_cash_30_days >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmt(cashPosition.projected_cash_30_days)}
                </span>
              </div>
            </div>
            <p className="text-text-secondary text-xs mt-3">{cashPosition.note}</p>
          </div>
        </div>
      )}

      {activeTab === 'pl' && pl && (
        <div className="bg-white rounded-xl p-5 shadow-sm max-w-lg">
          <h3 className="font-semibold text-text-primary mb-1">Profit & Loss Statement</h3>
          <p className="text-text-secondary text-xs mb-4">
            {new Date(pl.period?.from).toLocaleDateString('en-IN')} — {new Date(pl.period?.to).toLocaleDateString('en-IN')}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-primary font-medium">Revenue</span>
              <span className="font-bold text-green-600">{fmt(pl.revenue?.total)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Material Cost</span>
              <span className="text-red-500">-{fmt(pl.cost_of_goods?.material_cost)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border font-medium">
              <span className="text-text-primary">Gross Profit</span>
              <span className={pl.gross_profit >= 0 ? 'text-green-600' : 'text-red-500'}>{fmt(pl.gross_profit)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary text-xs">Gross Margin</span>
              <span className="text-text-secondary text-xs">{pl.gross_margin_percent}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Operating Expenses</span>
              <span className="text-red-500">-{fmt(pl.operating_expenses?.total)}</span>
            </div>
            {pl.operating_expenses?.by_category && Object.entries(pl.operating_expenses.by_category).map(([cat, amt]: any) => (
              <div key={cat} className="flex justify-between py-1 pl-4">
                <span className="text-text-secondary text-xs capitalize">{cat}</span>
                <span className="text-text-secondary text-xs">-{fmt(amt)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 border-t-2 border-border font-bold text-base">
              <span className="text-text-primary">Net Profit</span>
              <span className={pl.net_profit >= 0 ? 'text-green-600' : 'text-red-500'}>{fmt(pl.net_profit)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary text-xs">Net Margin</span>
              <span className="text-text-secondary text-xs">{pl.net_margin_percent}%</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'aging' && customerAging && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Customer Aging</h3>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: '0-30 days', value: customerAging.summary?.bucket_0_30, color: 'text-green-600' },
              { label: '31-60 days', value: customerAging.summary?.bucket_31_60, color: 'text-amber-500' },
              { label: '61-90 days', value: customerAging.summary?.bucket_61_90, color: 'text-orange-500' },
              { label: '90+ days', value: customerAging.summary?.bucket_90_plus, color: 'text-red-500' }
            ].map(b => (
              <div key={b.label} className="bg-surface rounded-lg p-3 text-center">
                <p className={`text-xl font-bold ${b.color}`}>{fmt(b.value)}</p>
                <p className="text-text-secondary text-xs mt-1">{b.label}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-light">
                <th className="text-left px-4 py-2 text-brand-primary font-medium">Customer</th>
                <th className="text-right px-4 py-2 text-brand-primary font-medium">0-30</th>
                <th className="text-right px-4 py-2 text-brand-primary font-medium">31-60</th>
                <th className="text-right px-4 py-2 text-brand-primary font-medium">61-90</th>
                <th className="text-right px-4 py-2 text-brand-primary font-medium">90+</th>
                <th className="text-right px-4 py-2 text-brand-primary font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {customerAging.customers?.map((c: any, i: number) => (
                <tr key={i} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-2 font-medium text-text-primary">{c.customer_name}</td>
                  <td className="px-4 py-2 text-right text-green-600 text-xs">{fmt(c.buckets['0_30'])}</td>
                  <td className="px-4 py-2 text-right text-amber-500 text-xs">{fmt(c.buckets['31_60'])}</td>
                  <td className="px-4 py-2 text-right text-orange-500 text-xs">{fmt(c.buckets['61_90'])}</td>
                  <td className="px-4 py-2 text-right text-red-500 text-xs">{fmt(c.buckets['90_plus'])}</td>
                  <td className="px-4 py-2 text-right font-bold">{fmt(c.total_outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'gst' && gst && (
        <div className="bg-white rounded-xl p-5 shadow-sm max-w-lg">
          <h3 className="font-semibold text-text-primary mb-1">GST Summary</h3>
          <p className="text-text-secondary text-xs mb-4">Month {gst.period?.month} — {gst.period?.year}</p>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Output Tax (Sales)</p>
              <div className="bg-surface rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-text-secondary">CGST</span><span>{fmt(gst.output_tax?.cgst)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">SGST</span><span>{fmt(gst.output_tax?.sgst)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">IGST</span><span>{fmt(gst.output_tax?.igst)}</span></div>
                <div className="flex justify-between font-bold border-t border-border pt-1"><span>Total Output</span><span className="text-red-500">{fmt(gst.output_tax?.total)}</span></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Input Tax Credit (Purchases)</p>
              <div className="bg-surface rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-text-secondary">CGST ITC</span><span>{fmt(gst.input_tax_credit?.cgst)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">SGST ITC</span><span>{fmt(gst.input_tax_credit?.sgst)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">IGST ITC</span><span>{fmt(gst.input_tax_credit?.igst)}</span></div>
                <div className="flex justify-between font-bold border-t border-border pt-1"><span>Total ITC</span><span className="text-green-600">{fmt(gst.input_tax_credit?.total)}</span></div>
              </div>
            </div>
            <div className="bg-brand-light rounded-lg p-3">
              <p className="text-sm font-medium text-brand-primary mb-2">Net GST Payable</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>CGST Payable</span><span className="font-medium">{fmt(gst.net_gst_payable?.cgst)}</span></div>
                <div className="flex justify-between"><span>SGST Payable</span><span className="font-medium">{fmt(gst.net_gst_payable?.sgst)}</span></div>
                <div className="flex justify-between"><span>IGST Payable</span><span className="font-medium">{fmt(gst.net_gst_payable?.igst)}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-blue-200 pt-2">
                  <span>Total Payable</span>
                  <span className="text-brand-primary">{fmt(gst.net_gst_payable?.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
