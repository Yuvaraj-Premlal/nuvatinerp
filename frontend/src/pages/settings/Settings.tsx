import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const AddSupplierModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    supplier_code: '',
    supplier_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    gstin: '',
    payment_terms: 'Net 30',
    lead_time_days: ''
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
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null
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
    location: ''
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
      operators_required: parseInt(form.operators_required)
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

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/api/suppliers').then(r => r.data.data) });
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });
  const { data: dies } = useQuery({ queryKey: ['dies'], queryFn: () => api.get('/api/dies').then(r => r.data.data) });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/api/customers').then(r => r.data.data) });
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/api/vendors').then(r => r.data.data) });

  const sections = [
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'machines', label: 'Machines' },
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

      {activeSection === 'toc' && (
        <div className="bg-white rounded-xl p-5 shadow-sm max-w-lg">
          <h3 className="font-semibold text-text-primary mb-4">TOC Constraint Configuration</h3>
          <TOCConfigSection />
        </div>
      )}
    </div>
  );
};

export default Settings;
