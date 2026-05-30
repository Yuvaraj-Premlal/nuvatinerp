import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const AddSupplierModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    supplier_code: '',
    supplier_name: '',
    supplier_type: 'direct',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    gstin: '',
    payment_terms: '',
    payment_days: '30',
    credit_limit: '',
    lead_time_days: '',
    moq: '',
    bank_name: '',
    bank_account: '',
    bank_ifsc: '',
    rating: ''
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
      payment_days: form.payment_days ? parseInt(form.payment_days) : 30,
      credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
      moq: form.moq ? parseFloat(form.moq) : null,
      rating: form.rating ? parseFloat(form.rating) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Supplier</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier Code</label>
              <input value={form.supplier_code} onChange={e => setForm({ ...form, supplier_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. SUP-HIND-001" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier Name</label>
              <input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">GSTIN</label>
              <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="15-digit GSTIN" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">City</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">State</label>
              <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Terms</label>
              <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance</option><option>COD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Lead Time (days)</label>
              <input type="number" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier Type</label>
              <select value={form.supplier_type} onChange={e => setForm({ ...form, supplier_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="direct">Direct (production material)</option>
                <option value="indirect">Indirect (consumables/services)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Credit Limit (₹)</label>
              <input type="number" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Rating (1-5)</label>
              <input type="number" min="1" max="5" step="0.1" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium text-text-primary mb-2">Bank Details</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-text-secondary mb-1">Bank Name</label>
                <input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Account No</label>
                <input value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" /></div>
              <div><label className="block text-xs text-text-secondary mb-1">IFSC Code</label>
                <input value={form.bank_ifsc} onChange={e => setForm({...form, bank_ifsc: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" /></div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Address</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add supplier</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddMachineModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    machine_code: '',
    machine_name: '',
    machine_type: 'die_casting',
    capacity_tons: '',
    rated_cycle_time_sec: '',
    oee_target_percent: '78',
    power_kw: '',
    operators_required: '2',
    location: '',
    fuel_type: 'gas',
    capacity_kg: '',
    lining_material: '',
    lining_life_kg: ''
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/machines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      capacity_tons: form.capacity_tons ? parseFloat(form.capacity_tons) : null,
      rated_cycle_time_sec: form.rated_cycle_time_sec ? parseFloat(form.rated_cycle_time_sec) : null,
      oee_target_percent: parseFloat(form.oee_target_percent),
      power_kw: form.power_kw ? parseFloat(form.power_kw) : null,
      operators_required: parseInt(form.operators_required),
      fuel_type: form.machine_type === 'furnace' ? form.fuel_type : null,
      capacity_kg: form.machine_type === 'furnace' && form.capacity_kg ? parseFloat(form.capacity_kg) : null,
      lining_material: form.machine_type === 'furnace' ? form.lining_material : null,
      lining_life_kg: form.machine_type === 'furnace' && form.lining_life_kg ? parseFloat(form.lining_life_kg) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Machine</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Machine Code</label>
              <input value={form.machine_code} onChange={e => setForm({ ...form, machine_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. DCM-250T-02" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Machine Name</label>
              <input value={form.machine_name} onChange={e => setForm({ ...form, machine_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Machine Type</label>
              <select value={form.machine_type} onChange={e => setForm({ ...form, machine_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="die_casting">Die Casting</option>
                <option value="cnc">CNC Machining</option>
                <option value="assembly">Assembly</option>
                <option value="trimming">Trimming Press</option>
                <option value="shot_blast">Shot Blasting</option>
                <option value="furnace">Furnace / Melting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Capacity (tons)</label>
              <input type="number" value={form.capacity_tons} onChange={e => setForm({ ...form, capacity_tons: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. 250" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Rated Cycle Time (sec)</label>
              <input type="number" value={form.rated_cycle_time_sec} onChange={e => setForm({ ...form, rated_cycle_time_sec: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. 48" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">OEE Target %</label>
              <input type="number" value={form.oee_target_percent} onChange={e => setForm({ ...form, oee_target_percent: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Power (kW)</label>
              <input type="number" value={form.power_kw} onChange={e => setForm({ ...form, power_kw: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. 45" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Operators Required</label>
              <input type="number" value={form.operators_required} onChange={e => setForm({ ...form, operators_required: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. Bay 1" />
            </div>
          </div>
          {form.machine_type === 'furnace' && (
            <div className="border-t border-border pt-3">
              <p className="text-sm font-medium text-text-primary mb-2">Furnace Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => setForm({ ...form, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    {['gas', 'electric', 'oil', 'induction'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Capacity (KG)</label>
                  <input type="number" value={form.capacity_kg} onChange={e => setForm({ ...form, capacity_kg: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Lining Material</label>
                  <input value={form.lining_material} onChange={e => setForm({ ...form, lining_material: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. silica" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Lining Life (KG melted)</label>
                  <input type="number" value={form.lining_life_kg} onChange={e => setForm({ ...form, lining_life_kg: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. 500000" />
                </div>
              </div>
            </div>
          )}
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add machine</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddDieModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    die_number: '',
    die_name: '',
    machine_id: '',
    material: 'H13',
    number_of_cavities: '1',
    design_life_shots: '',
    pm_interval_shots: '20000',
    shots_at_last_pm: '0'
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => api.get('/api/machines').then(r => r.data.data)
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/dies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      number_of_cavities: parseInt(form.number_of_cavities),
      design_life_shots: form.design_life_shots ? parseInt(form.design_life_shots) : null,
      pm_interval_shots: parseInt(form.pm_interval_shots),
      shots_at_last_pm: parseInt(form.shots_at_last_pm),
      current_shot_count: 0,
      current_status: 'available'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Die</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Die Number</label>
              <input value={form.die_number} onChange={e => setForm({ ...form, die_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. D-048" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Die Name</label>
              <input value={form.die_name} onChange={e => setForm({ ...form, die_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Part name this die makes" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Machine</label>
              <select value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select machine...</option>
                {machines?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.machine_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Material</label>
              <select value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option>H13</option><option>H11</option><option>P20</option><option>D2</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Cavities</label>
              <input type="number" value={form.number_of_cavities} onChange={e => setForm({ ...form, number_of_cavities: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Design Life (shots)</label>
              <input type="number" value={form.design_life_shots} onChange={e => setForm({ ...form, design_life_shots: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. 300000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">PM Interval (shots)</label>
              <input type="number" value={form.pm_interval_shots} onChange={e => setForm({ ...form, pm_interval_shots: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Shots at Last PM</label>
              <input type="number" value={form.shots_at_last_pm} onChange={e => setForm({ ...form, shots_at_last_pm: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add die</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Die'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddCustomerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customer_code: '',
    customer_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    gstin: '',
    payment_terms: 'Net 30'
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Customer</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Customer Code</label>
              <input value={form.customer_code} onChange={e => setForm({ ...form, customer_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. CUST-BAJAJ-001" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Customer Name</label>
              <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">GSTIN</label>
              <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">City</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">State</label>
              <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Payment Terms</label>
              <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance</option><option>COD</option>
              </select>
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add customer</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddVendorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    vendor_code: '',
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    gstin: '',
    service_type: 'machining',
    payment_terms: 'Net 30'
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Vendor</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Vendor Code</label>
              <input value={form.vendor_code} onChange={e => setForm({ ...form, vendor_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g. VEN-CNC-002" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Vendor Name</label>
              <input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Service Type</label>
              <select value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="machining">Machining</option>
                <option value="plating">Plating / Surface Treatment</option>
                <option value="heat_treatment">Heat Treatment</option>
                <option value="assembly">Assembly</option>
                <option value="painting">Painting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">GSTIN</label>
              <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">City</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">State</label>
              <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add vendor</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CostConfigSection: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: configs } = useQuery({
    queryKey: ['costConfig'],
    queryFn: () => api.get('/api/costing/config').then(r => r.data.data)
  });

  const getConfig = (key: string) => configs?.find((c: any) => c.config_key === key)?.config_value || '';

  const [values, setValues] = useState<any>({});

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/costing/config', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['costConfig'] })
  });

  const handleSave = (key: string) => {
    mutation.mutate({ config_key: key, config_value: parseFloat(values[key] || getConfig(key)) });
  };

  const configItems = [
    { key: 'energy_rate_per_kwh', label: 'Energy Rate', unit: '₹ per kWh', placeholder: '8' },
    { key: 'operator_rate_per_shift', label: 'Operator Rate', unit: '₹ per shift', placeholder: '800' },
    { key: 'scrap_rate_per_kg', label: 'Scrap Recovery Rate', unit: '₹ per kg', placeholder: '80' },
    { key: 'operating_expense_per_shift', label: 'Operating Expense', unit: '₹ per shift', placeholder: '48000' }
  ];

  return (
    <div className="space-y-3">
      <div className="bg-brand-light rounded-lg p-3 text-xs text-brand-primary">
        Variable cost only — excludes depreciation, rent, and admin overhead
      </div>
      {configItems.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">{item.label}</p>
            <p className="text-xs text-text-secondary">{item.unit}</p>
          </div>
          <input
            type="number"
            defaultValue={getConfig(item.key)}
            onChange={e => setValues({ ...values, [item.key]: e.target.value })}
            className="w-32 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-right"
            placeholder={item.placeholder}
          />
          <button
            onClick={() => handleSave(item.key)}
            className="px-3 py-2 bg-brand-primary text-white rounded-lg text-xs font-medium hover:bg-brand-dark"
          >
            Save
          </button>
        </div>
      ))}
    </div>
  );
};

const TOCConfigSection: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ['constraintConfig'],
    queryFn: () => api.get('/api/toc/constraint').then(r => r.data.data)
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => api.get('/api/machines').then(r => r.data.data)
  });

  const { data: detectData } = useQuery({
    queryKey: ['detectConstraint'],
    queryFn: () => api.get('/api/toc/detect-constraint').then(r => r.data.data)
  });

  const [form, setForm] = useState({
    machine_id: '',
    buffer_target_hours: '4',
    effective_from: new Date().toISOString().split('T')[0]
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/toc/constraint', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['constraintConfig'] })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      buffer_target_hours: parseFloat(form.buffer_target_hours),
      effective_from: new Date(form.effective_from).toISOString()
    });
  };

  return (
    <div className="space-y-4">
      {config && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm font-medium text-green-700">Current Constraint</p>
          <p className="text-green-600 text-sm">{config.machine?.machine_name} — Buffer target {config.buffer_target_hours} hrs</p>
        </div>
      )}

      {detectData && (
        <div className="bg-brand-light rounded-lg p-3">
          <p className="text-xs font-medium text-brand-primary mb-2">System Recommendation</p>
          <p className="text-xs text-brand-dark">{detectData.recommendation}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Constraint Machine</label>
          <select
            value={form.machine_id}
            onChange={e => setForm({ ...form, machine_id: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            required
          >
            <option value="">Select machine...</option>
            {machines?.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.machine_name} {m.is_constraint ? '★ Current' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Buffer Target (hours)</label>
            <input
              type="number"
              value={form.buffer_target_hours}
              onChange={e => setForm({ ...form, buffer_target_hours: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Effective From</label>
            <input
              type="date"
              value={form.effective_from}
              onChange={e => setForm({ ...form, effective_from: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>
        {mutation.isError && <p className="text-red-500 text-sm">Failed to update constraint</p>}
        {mutation.isSuccess && <p className="text-green-500 text-sm">Constraint updated successfully</p>}
        <button type="submit" disabled={mutation.isPending} className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          {mutation.isPending ? 'Updating...' : 'Set Constraint'}
        </button>
      </form>
    </div>
  );
};

const MasterTable: React.FC<{ title: string; data: any[]; columns: { key: string; label: string }[]; onAdd: () => void }> = ({ title, data, columns, onAdd }) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-text-primary">{title}</h3>
      <button onClick={onAdd} className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">
        + Add
      </button>
    </div>
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-light">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-2 text-brand-primary font-medium text-xs">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any, i: number) => (
            <tr key={row.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
              {columns.map(col => (
                <td key={col.key} className="px-4 py-2 text-xs text-text-primary">{row[col.key] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data?.length === 0 && (
        <div className="text-center py-6 text-text-secondary text-sm">No records found</div>
      )}
    </div>
  </div>
);

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('suppliers');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showDieModal, setShowDieModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAlloySpecModal, setShowAlloySpecModal] = useState(false);

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/api/suppliers').then(r => r.data.data) });
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });
  const { data: dies } = useQuery({ queryKey: ['dies'], queryFn: () => api.get('/api/dies').then(r => r.data.data) });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/api/customers').then(r => r.data.data) });
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/api/vendors').then(r => r.data.data) });
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.get('/api/locations').then(r => r.data.data) });
  const { data: alloySpecs } = useQuery({ queryKey: ['alloyGrades'], queryFn: () => api.get('/api/melt/alloy-grades').then(r => r.data.data) });

  const sections = [
    { id: 'items', label: 'Items' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'payment_terms', label: 'Payment Terms' },
    { id: 'machines', label: 'Machines' },
    { id: 'locations', label: 'Locations' },
    { id: 'alloy_specs', label: 'Alloy Specs' },
    { id: 'cost_centres', label: 'Cost Centres' },
    { id: 'dies', label: 'Dies' },
    { id: 'customers', label: 'Customers' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'cost', label: 'Cost Config' },
    { id: 'toc', label: 'TOC Config' }
  ];

  return (
    <div className="space-y-6">
      {showSupplierModal && <AddSupplierModal onClose={() => setShowSupplierModal(false)} />}
      {showMachineModal && <AddMachineModal onClose={() => setShowMachineModal(false)} />}
      {showDieModal && <AddDieModal onClose={() => setShowDieModal(false)} />}
      {showCustomerModal && <AddCustomerModal onClose={() => setShowCustomerModal(false)} />}
      {showVendorModal && <AddVendorModal onClose={() => setShowVendorModal(false)} />}
      {showLocationModal && <AddLocationModal onClose={() => setShowLocationModal(false)} />}
      {showAlloySpecModal && <AddAlloySpecModal onClose={() => setShowAlloySpecModal(false)} />}

      <div>
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Masters, cost configuration and TOC setup</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === s.id
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-secondary hover:bg-surface border border-border'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'items' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-text-primary">Item Master</p>
            <button onClick={() => setShowItemModal(true)} className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">+ Add Item</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Code</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Name</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Category</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">UOM</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">HSN</th>
                <th className="text-right px-4 py-3 text-brand-primary font-medium">Std Cost</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">P.Type</th>
              </tr></thead>
              <tbody>
                {items?.map((item: any, i: number) => (
                  <tr key={item.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3 font-medium text-brand-primary text-xs">{item.item_code}</td>
                    <td className="px-4 py-3 text-text-primary text-xs">{item.item_name}</td>
                    <td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 rounded-full bg-surface border border-border">{item.item_type}</span></td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{item.item_category || '—'}</td>
                    <td className="px-4 py-3 text-xs">{item.unit_of_measure}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{item.hsn_code || '—'}</td>
                    <td className="px-4 py-3 text-xs text-right">₹{item.standard_cost || item.material_cost || '—'}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${item.purchase_type === 'indirect' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{item.purchase_type || 'direct'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!items || items.length === 0) && <div className="text-center py-12 text-text-secondary">No items defined yet</div>}
          </div>
        </div>
      )}

      {activeSection === 'payment_terms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-text-primary">Payment Terms</p>
            <button onClick={() => setShowPaymentTermsModal(true)} className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">+ Add Terms</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Code</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Description</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Days</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Discount %</th>
                <th className="text-center px-4 py-3 text-brand-primary font-medium">Discount Days</th>
              </tr></thead>
              <tbody>
                {paymentTermsList?.map((pt: any, i: number) => (
                  <tr key={pt.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3 font-medium text-brand-primary text-xs">{pt.code}</td>
                    <td className="px-4 py-3 text-xs">{pt.description}</td>
                    <td className="px-4 py-3 text-xs text-center font-medium">{pt.days}</td>
                    <td className="px-4 py-3 text-xs text-center">{pt.discount_percent ? `${pt.discount_percent}%` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-center">{pt.discount_days || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!paymentTermsList || paymentTermsList.length === 0) && <div className="text-center py-12 text-text-secondary">No payment terms defined yet</div>}
          </div>
        </div>
      )}

      {activeSection === 'suppliers' && (
        <MasterTable
          title="Suppliers"
          data={suppliers || []}
          columns={[
            { key: 'supplier_code', label: 'Code' },
            { key: 'supplier_name', label: 'Name' },
            { key: 'contact_person', label: 'Contact' },
            { key: 'phone', label: 'Phone' },
            { key: 'city', label: 'City' },
            { key: 'payment_terms', label: 'Terms' }
          ]}
          onAdd={() => setShowSupplierModal(true)}
        />
      )}

      {activeSection === 'machines' && (
        <MasterTable
          title="Machines"
          data={machines || []}
          columns={[
            { key: 'machine_code', label: 'Code' },
            { key: 'machine_name', label: 'Name' },
            { key: 'machine_type', label: 'Type' },
            { key: 'capacity_tons', label: 'Capacity (T)' },
            { key: 'rated_cycle_time_sec', label: 'Cycle (sec)' },
            { key: 'oee_target_percent', label: 'OEE Target' },
            { key: 'power_kw', label: 'kW' }
          ]}
          onAdd={() => setShowMachineModal(true)}
        />
      )}

      {activeSection === 'dies' && (
        <MasterTable
          title="Dies"
          data={dies || []}
          columns={[
            { key: 'die_number', label: 'Die No' },
            { key: 'die_name', label: 'Name' },
            { key: 'material', label: 'Material' },
            { key: 'number_of_cavities', label: 'Cavities' },
            { key: 'current_shot_count', label: 'Shots' },
            { key: 'pm_interval_shots', label: 'PM Interval' },
            { key: 'current_status', label: 'Status' }
          ]}
          onAdd={() => setShowDieModal(true)}
        />
      )}

      {activeSection === 'customers' && (
        <MasterTable
          title="Customers"
          data={customers || []}
          columns={[
            { key: 'customer_code', label: 'Code' },
            { key: 'customer_name', label: 'Name' },
            { key: 'contact_person', label: 'Contact' },
            { key: 'phone', label: 'Phone' },
            { key: 'city', label: 'City' },
            { key: 'payment_terms', label: 'Terms' }
          ]}
          onAdd={() => setShowCustomerModal(true)}
        />
      )}

      {activeSection === 'vendors' && (
        <MasterTable
          title="Job Work Vendors"
          data={vendors || []}
          columns={[
            { key: 'vendor_code', label: 'Code' },
            { key: 'vendor_name', label: 'Name' },
            { key: 'service_type', label: 'Service' },
            { key: 'contact_person', label: 'Contact' },
            { key: 'phone', label: 'Phone' },
            { key: 'city', label: 'City' }
          ]}
          onAdd={() => setShowVendorModal(true)}
        />
      )}

      {activeSection === 'cost' && (
        <div className="bg-white rounded-xl p-5 shadow-sm max-w-lg">
          <h3 className="font-semibold text-text-primary mb-4">Cost Configuration</h3>
          <CostConfigSection />
        </div>
      )}

      {activeSection === 'locations' && (
        <MasterTable
          title="Storage Locations"
          data={locations || []}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'description', label: 'Description' },
            { key: 'zone', label: 'Zone' },
            { key: 'type', label: 'Type' },
            { key: 'is_active', label: 'Active' }
          ]}
          onAdd={() => setShowLocationModal(true)}
        />
      )}

      {activeSection === 'alloy_specs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-text-primary">Alloy Chemistry Specs</p>
            <button onClick={() => setShowAlloySpecModal(true)} className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">+ Add Alloy Spec</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-brand-light">
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Standard</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">System</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Melt Temp</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Transfer Temp</th>
                <th className="text-left px-4 py-3 text-brand-primary font-medium">Key Limits</th>
              </tr></thead>
              <tbody>
                {alloySpecs?.map((g: any, i: number) => (
                  <tr key={g.id} className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                    <td className="px-4 py-3"><p className="font-medium text-text-primary">{g.item?.item_code}</p><p className="text-text-secondary text-xs">{g.item?.item_name}</p></td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{g.standard || '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{g.alloy_system || '—'}</td>
                    <td className="px-4 py-3 text-xs">{g.melt_temp_min && g.melt_temp_max ? `${g.melt_temp_min}–${g.melt_temp_max}°C` : '—'}</td>
                    <td className="px-4 py-3 text-xs">{g.transfer_temp_min && g.transfer_temp_max ? `${g.transfer_temp_min}–${g.transfer_temp_max}°C` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{['si', 'cu', 'fe'].filter(el => g[`${el}_max`]).map(el => `${el.toUpperCase()} ≤${g[`${el}_max`]}`).join(' | ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!alloySpecs || alloySpecs.length === 0) && <div className="text-center py-12 text-text-secondary">No alloy specs defined yet</div>}
          </div>
        </div>
      )}

      {activeSection === 'toc' && (
        <div className="bg-white rounded-xl p-5 shadow-sm max-w-lg">
          <h3 className="font-semibold text-text-primary mb-4">TOC Constraint Configuration</h3>
          <TOCConfigSection />
        </div>
      )}
    </div>
  );
};

const AddLocationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: '', description: '', zone: '', type: 'store' });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/locations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Location</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Location Code <span className="text-red-500">*</span></label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. A-R1-B1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. Zone A, Rack 1, Bin 1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Zone</label>
            <input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. A, B, C" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Type <span className="text-red-500">*</span></label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
              <option value="store">Store (Bin / Rack)</option>
              <option value="shop_floor">Shop Floor (Machine / Work Centre)</option>
            </select>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add location</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddAlloySpecModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const elements = ['si', 'cu', 'fe', 'mn', 'mg', 'ni', 'zn', 'sn', 'ti', 'pb'];
  const [form, setForm] = useState<any>({ item_id: '', standard: '', alloy_system: 'Al-Si', melt_temp_min: '', melt_temp_max: '', transfer_temp_min: '', transfer_temp_max: '', pouring_temp_min: '', pouring_temp_max: '' });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const rawMaterials = items?.filter((i: any) => i.item_type === 'raw_material') || [];
  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/melt/alloy-grades', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alloyGrades'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  const clsXs = "w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Alloy Spec</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Raw Material Item <span className="text-red-500">*</span></label>
              <select value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} className={cls}>
                <option value="">Select item...</option>
                {rawMaterials.map((i: any) => <option key={i.id} value={i.id}>{i.item_code} — {i.item_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Standard</label>
              <input value={form.standard} onChange={e => setForm({ ...form, standard: e.target.value })} className={cls} placeholder="e.g. JIS H5302" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Alloy System</label>
            <select value={form.alloy_system} onChange={e => setForm({ ...form, alloy_system: e.target.value })} className={cls}>
              {['Al-Si', 'Al-Cu', 'Al-Mg', 'Al-Zn', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Chemistry Spec (% by weight) — min / max per element</p>
            <div className="grid grid-cols-5 gap-2">
              {elements.map(el => (
                <div key={el} className="space-y-1">
                  <p className="text-xs text-text-secondary uppercase font-medium text-center">{el}</p>
                  <input type="number" step="0.01" className={clsXs} placeholder="min" onChange={e => setForm({ ...form, [`${el}_min`]: parseFloat(e.target.value) })} />
                  <input type="number" step="0.01" className={clsXs} placeholder="max" onChange={e => setForm({ ...form, [`${el}_max`]: parseFloat(e.target.value) })} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Temperature Spec (°C)</p>
            <div className="grid grid-cols-3 gap-3">
              {[['melt_temp', 'Melt Temp'], ['transfer_temp', 'Transfer Temp'], ['pouring_temp', 'Pouring Temp']].map(([key, label]) => (
                <div key={key}>
                  <p className="text-xs text-text-secondary mb-1">{label}</p>
                  <div className="flex gap-1">
                    <input type="number" className={clsXs} placeholder="min" onChange={e => setForm({ ...form, [`${key}_min`]: parseFloat(e.target.value) })} />
                    <input type="number" className={clsXs} placeholder="max" onChange={e => setForm({ ...form, [`${key}_max`]: parseFloat(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add alloy spec</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.item_id || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Alloy Spec'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddCostCentreModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: '', name: '', type: 'department', machine_id: '' });
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });
  const furnaces = machines?.filter((m: any) => m.machine_type === 'furnace') || [];
  const allMachines = machines || [];
  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/cost-centres', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['costCentres'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Cost Centre</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Code <span className="text-red-500">*</span></label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className={cls} placeholder="e.g. CC-MELT-F01" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={cls} placeholder="e.g. Melting Furnace F-01" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Type <span className="text-red-500">*</span></label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, machine_id: '' })} className={cls}>
              <option value="department">Department</option>
              <option value="machine">Machine</option>
              <option value="project">Project</option>
              <option value="overhead">Overhead</option>
            </select>
          </div>
          {form.type === 'machine' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Linked Machine</label>
              <select value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })} className={cls}>
                <option value="">Select machine...</option>
                {allMachines.map((m: any) => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
              </select>
            </div>
          )}
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add cost centre</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({ ...form, machine_id: form.machine_id || null })}
              disabled={!form.code || !form.name || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Cost Centre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddItemModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    item_code: '', item_name: '', item_type: 'raw_material', item_category: '',
    unit_of_measure: 'KG', hsn_code: '', purchase_type: 'direct',
    standard_cost: '', material_cost: '', selling_price: '',
    reorder_point: '', safety_stock: '', order_quantity: '', description: ''
  });
  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/items', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['items'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Item</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-secondary mb-1">Item Code <span className="text-red-500">*</span></label>
              <input value={form.item_code} onChange={e => setForm({...form, item_code: e.target.value.toUpperCase()})} className={cls} placeholder="e.g. RM-ADC12" required /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Item Name <span className="text-red-500">*</span></label>
              <input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className={cls} required /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Item Type <span className="text-red-500">*</span></label>
              <select value={form.item_type} onChange={e => setForm({...form, item_type: e.target.value})} className={cls}>
                {['raw_material','finished_goods','semi_finished','consumable','spare','tool','packaging'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Category</label>
              <input value={form.item_category} onChange={e => setForm({...form, item_category: e.target.value})} className={cls} placeholder="e.g. alloy, fastener" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Unit of Measure <span className="text-red-500">*</span></label>
              <select value={form.unit_of_measure} onChange={e => setForm({...form, unit_of_measure: e.target.value})} className={cls}>
                {['KG','NOS','LTR','MTR','SQM','SET','BOX','PKT'].map(u => <option key={u} value={u}>{u}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">HSN Code</label>
              <input value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} className={cls} placeholder="e.g. 76029000" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Purchase Type</label>
              <select value={form.purchase_type} onChange={e => setForm({...form, purchase_type: e.target.value})} className={cls}>
                <option value="direct">Direct (production material)</option>
                <option value="indirect">Indirect (consumable/overhead)</option>
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Standard Cost (₹)</label>
              <input type="number" value={form.standard_cost} onChange={e => setForm({...form, standard_cost: e.target.value})} className={cls} placeholder="per UOM" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Material Cost (₹)</label>
              <input type="number" value={form.material_cost} onChange={e => setForm({...form, material_cost: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Selling Price (₹)</label>
              <input type="number" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} className={cls} /></div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-text-primary mb-2">Stock Control</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-text-secondary mb-1">Reorder Point</label>
                <input type="number" value={form.reorder_point} onChange={e => setForm({...form, reorder_point: e.target.value})} className={cls} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Safety Stock</label>
                <input type="number" value={form.safety_stock} onChange={e => setForm({...form, safety_stock: e.target.value})} className={cls} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Order Quantity</label>
                <input type="number" value={form.order_quantity} onChange={e => setForm({...form, order_quantity: e.target.value})} className={cls} /></div>
            </div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={cls} rows={2} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add item</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, standard_cost: form.standard_cost ? parseFloat(form.standard_cost) : null, material_cost: form.material_cost ? parseFloat(form.material_cost) : null, selling_price: form.selling_price ? parseFloat(form.selling_price) : null, reorder_point: form.reorder_point ? parseFloat(form.reorder_point) : null, safety_stock: form.safety_stock ? parseFloat(form.safety_stock) : null, order_quantity: form.order_quantity ? parseFloat(form.order_quantity) : null})}
              disabled={!form.item_code || !form.item_name || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddPaymentTermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: '', description: '', days: '30', discount_percent: '', discount_days: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/payment-terms', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['paymentTerms'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Payment Terms</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-xs text-text-secondary mb-1">Code <span className="text-red-500">*</span></label>
            <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className={cls} placeholder="e.g. NET30" /></div>
          <div><label className="block text-xs text-text-secondary mb-1">Description <span className="text-red-500">*</span></label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={cls} placeholder="e.g. Net 30 days" /></div>
          <div><label className="block text-xs text-text-secondary mb-1">Payment Days <span className="text-red-500">*</span></label>
            <input type="number" value={form.days} onChange={e => setForm({...form, days: e.target.value})} className={cls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-secondary mb-1">Early Payment Discount %</label>
              <input type="number" step="0.1" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} className={cls} placeholder="e.g. 2" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">If paid within (days)</label>
              <input type="number" value={form.discount_days} onChange={e => setForm({...form, discount_days: e.target.value})} className={cls} placeholder="e.g. 10" /></div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add payment terms</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, days: parseInt(form.days), discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null, discount_days: form.discount_days ? parseInt(form.discount_days) : null})}
              disabled={!form.code || !form.description || !form.days || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Terms'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
