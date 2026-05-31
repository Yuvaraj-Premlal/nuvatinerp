import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const ITEM_CATEGORIES: Record<string, string[]> = {
  raw_material: ['Alloy','Die Spray','Lubricant','Flux','Spare Part','Cutting Tool','Packaging','Fastener','Electrical','Safety','Other'],
  consumable: ['Die Spray','Lubricant','Flux','Cutting Tool','Packaging','Fastener','Electrical','Safety','Other'],
  spare: ['Spare Part','Electrical','Hydraulic','Pneumatic','Other'],
  tool: ['Cutting Tool','Die Component','Fixture','Gauge','Other'],
  packaging: ['Packaging','Other'],
  semi_finished: ['Casting (Semi Finished)','Machined Component (Semi Finished)','Assembly (Semi Finished)'],
  finished_goods: ['Casting (Finished)','Machined Component (Finished)','Assembly (Finished)'],
};

const SOURCE_OPTIONS = [
  { value: 'domestic', label: 'Domestic (India)' },
  { value: 'import_usa', label: 'Import — USA' },
  { value: 'import_europe', label: 'Import — Europe' },
  { value: 'import_other', label: 'Import — Other' },
  { value: 'internal', label: 'Internal' },
];

const SOURCE_LABEL: Record<string, string> = {
  domestic: 'Domestic', import_usa: 'Import USA', import_europe: 'Import Europe',
  import_other: 'Import Other', internal: 'Internal'
};


const AddSupplierModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { data: paymentTermsList } = useQuery({ queryKey: ['paymentTerms'], queryFn: () => api.get('/api/payment-terms').then(r => r.data.data) });
  const [form, setForm] = useState<any>({
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Supplier Name <span className="text-red-500">*</span></label>
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
              <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })}
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
              <select value={form.payment_terms_id} onChange={e => {
                const pt = paymentTermsList?.find((p: any) => p.id === e.target.value);
                setForm({ ...form, payment_terms_id: e.target.value, payment_terms: pt?.description || '', payment_days: pt?.days || 30 });
              }} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select payment terms...</option>
                {paymentTermsList?.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.code} — {pt.description}</option>)}
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
            <button type="submit" disabled={!form.supplier_name || mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
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
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.get('/api/locations').then(r => r.data.data) });
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
          <div><h2 className="font-bold text-text-primary">Add Machine</h2><p className="text-xs text-text-secondary mt-0.5">Code auto-generated: DC-250-001, FURN-001</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Machine Name <span className="text-red-500">*</span></label>
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
              <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                <option value="">Select location...</option>
                {locations?.map((l: any) => <option key={l.id} value={l.code}>{l.code}{l.description ? ` — ${l.description}` : ''}</option>)}
              </select>
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
  const [form, setForm] = useState<any>({
    die_name: '', machine_id: '', item_id: '',
    cavity_count: '1', design_life_shots: '',
    pm_interval_shots: '20000', die_owner: ''
  });
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });
  const finishedGoods = items?.filter((i: any) => i.item_type === 'finished_goods') || [];
  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/dies', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dies'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Add Die</h2><p className="text-xs text-text-secondary mt-0.5">Number auto-generated as DIE-YYYY-NNNN</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Die Name <span className="text-red-500">*</span></label>
              <input value={form.die_name} onChange={e => setForm({...form, die_name: e.target.value})} className={cls} placeholder="e.g. Brake Housing LH" required /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Part (Finished Good)</label>
              <select value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})} className={cls}>
                <option value="">Select part...</option>
                {finishedGoods.map((i: any) => <option key={i.id} value={i.id}>{i.item_code} — {i.item_name}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Machine</label>
              <select value={form.machine_id} onChange={e => setForm({...form, machine_id: e.target.value})} className={cls}>
                <option value="">Select machine...</option>
                {machines?.filter((m: any) => m.machine_type !== 'furnace').map((m: any) => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Cavities</label>
              <input type="number" value={form.cavity_count} onChange={e => setForm({...form, cavity_count: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Design Life (shots)</label>
              <input type="number" value={form.design_life_shots} onChange={e => setForm({...form, design_life_shots: e.target.value})} className={cls} placeholder="e.g. 300000" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">PM Interval (shots)</label>
              <input type="number" value={form.pm_interval_shots} onChange={e => setForm({...form, pm_interval_shots: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Die Owner</label>
              <input value={form.die_owner} onChange={e => setForm({...form, die_owner: e.target.value})} className={cls} placeholder="Customer or company name" /></div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add die</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, item_id: form.item_id || null, machine_id: form.machine_id || null, current_shot_count: 0, current_status: 'available'})}
              disabled={!form.die_name || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Die'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const AddCustomerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { data: paymentTermsList } = useQuery({ queryKey: ['paymentTerms'], queryFn: () => api.get('/api/payment-terms').then(r => r.data.data) });
  const [form, setForm] = useState<any>({ customer_name: '', contact_person: '', contact_email: '', contact_phone: '', address: '', city: '', state: '', gstin: '', payment_terms: '', payment_terms_id: '' });
  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/customers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Add Customer</h2><p className="text-xs text-text-secondary mt-0.5">Code will be auto-generated as CUST-[NAME]-[NNNN]</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-xs text-text-secondary mb-1">Customer Name <span className="text-red-500">*</span></label>
            <input value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className={cls} placeholder="e.g. Bajaj Auto Ltd" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-secondary mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Phone</label>
              <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className={cls} placeholder="10-digit mobile" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Email</label>
              <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">GSTIN</label>
              <input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})} className={cls} placeholder="15-char GSTIN" maxLength={15} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">City</label>
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">State</label>
              <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className={cls} /></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Address</label>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={cls} /></div>
          <div><label className="block text-xs text-text-secondary mb-1">Payment Terms</label>
            <select value={form.payment_terms_id} onChange={e => {
              const pt = paymentTermsList?.find((p: any) => p.id === e.target.value);
              setForm({...form, payment_terms_id: e.target.value, payment_terms: pt?.description || ''});
            }} className={cls}>
              <option value="">Select payment terms...</option>
              {paymentTermsList?.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.code} — {pt.description}</option>)}
            </select></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add customer</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.customer_name || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddVendorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { data: paymentTermsList } = useQuery({ queryKey: ['paymentTerms'], queryFn: () => api.get('/api/payment-terms').then(r => r.data.data) });
  const [form, setForm] = useState<any>({ vendor_name: '', service_type: 'machining', contact_person: '', contact_phone: '', contact_email: '', address: '', city: '', state: '', gstin: '', payment_terms: '', payment_terms_id: '', lead_time_days: '' });
  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/api/vendors', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Add Vendor</h2><p className="text-xs text-text-secondary mt-0.5">Code auto-generated as VEND-[NAME]-[NNNN]</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-xs text-text-secondary mb-1">Vendor Name <span className="text-red-500">*</span></label>
            <input value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} className={cls} placeholder="e.g. Precision CNC Works" required /></div>
          <div><label className="block text-xs text-text-secondary mb-1">Service Type <span className="text-red-500">*</span></label>
            <select value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className={cls}>
              {['machining','plating','heat_treatment','assembly','painting','shot_blast','fettling','other'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-secondary mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Phone</label>
              <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Email</label>
              <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">GSTIN</label>
              <input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})} className={cls} maxLength={15} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">City</label>
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Lead Time (days)</label>
              <input type="number" value={form.lead_time_days} onChange={e => setForm({...form, lead_time_days: e.target.value})} className={cls} /></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Payment Terms</label>
            <select value={form.payment_terms_id} onChange={e => {
              const pt = paymentTermsList?.find((p: any) => p.id === e.target.value);
              setForm({...form, payment_terms_id: e.target.value, payment_terms: pt?.description || ''});
            }} className={cls}>
              <option value="">Select payment terms...</option>
              {paymentTermsList?.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.code} — {pt.description}</option>)}
            </select></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to add vendor</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null})}
              disabled={!form.vendor_name || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Vendor'}
            </button>
          </div>
        </div>
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

const MasterTable: React.FC<{
  title: string; data: any[];
  columns: { key: string; label: string }[];
  onAdd: () => void;
  onEdit?: (row: any) => void;
  onHistory?: (row: any) => void;
  onToggleStatus?: (row: any) => void;
  onView?: (row: any) => void;
  searchFields?: string[];
  filterConfig?: { key: string; label: string; options: string[] }[];
}> = ({ title, data, columns, onAdd, onEdit, onHistory, onToggleStatus, onView, searchFields, filterConfig }) => {
  const [search, setSearch] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string>>({});

  const filtered = React.useMemo(() => {
    return data.filter((row: any) => {
      const s = search.toLowerCase();
      const matchSearch = !s || !searchFields || searchFields.some(f => row[f]?.toString().toLowerCase().includes(s));
      const matchFilters = !filterConfig || filterConfig.every(fc => {
        const fv = filters[fc.key];
        if (!fv) return true;
        if (fc.key === 'status') return fv === 'active' ? row.is_active !== false : row.is_active === false;
        return row[fc.key] === fv;
      });
      return matchSearch && matchFilters;
    });
  }, [data, search, filters, searchFields, filterConfig]);

  const sel = "px-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white";
  const hasFilters = search || Object.values(filters).some(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">{title}</h3>
        <button onClick={onAdd} className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark">+ Add</button>
      </div>
      {(searchFields || filterConfig) && (
        <div className="flex flex-wrap gap-2 items-center">
          {searchFields && <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search..."
            className="px-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary w-56" />}
          {filterConfig?.map((fc: any) => (
            <select key={fc.key} value={filters[fc.key] || ''} onChange={e => setFilters({...filters, [fc.key]: e.target.value})} className={sel}>
              <option value="">{fc.label}: All</option>
              {fc.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {hasFilters && <button onClick={() => { setSearch(''); setFilters({}); }} className="text-xs text-red-500 px-2">✕ Clear</button>}
          <span className="text-xs text-text-secondary ml-auto">{filtered.length} of {data.length}</span>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-light">
              {columns.map(col => (
                <th key={col.key} className="text-left px-4 py-2 text-brand-primary font-medium text-xs">{col.label}</th>
              ))}
              <th className="text-right px-4 py-2 text-brand-primary font-medium text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row: any, i: number) => (
              <tr key={row.id} className={`border-t border-border ${row.is_active === false ? 'opacity-40 bg-gray-50' : i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                {columns.map((col, ci) => (
                  <td key={col.key} className="px-4 py-2 text-xs text-text-primary">
                    {col.key === 'is_active'
                      ? <span className={`px-2 py-0.5 rounded-full text-xs ${row.is_active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{row.is_active !== false ? 'Active' : 'Inactive'}</span>
                      : ci === 0 && onView
                        ? <button onClick={() => onView(row)} className="font-medium text-brand-primary hover:underline">{row[col.key] || '—'}</button>
                        : row[col.key] || '—'}
                  </td>
                ))}
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onEdit && <button onClick={() => onEdit(row)} title="Edit" className="text-brand-primary text-xs px-2 py-1 rounded border border-brand-primary hover:bg-brand-light">✏️</button>}
                    {onHistory && <button onClick={() => onHistory(row)} title="History" className="text-text-secondary text-xs px-2 py-1 rounded border border-border hover:bg-surface">🕐</button>}
                    {onToggleStatus && <button onClick={() => onToggleStatus(row)} title={row.is_active !== false ? 'Deactivate' : 'Activate'} className={`text-xs px-2 py-1 rounded border ${row.is_active !== false ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>{row.is_active !== false ? '🔴' : '🟢'}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-6 text-text-secondary text-sm">{data.length === 0 ? 'No records found' : 'No records match your filters'}</div>}
      </div>
    </div>
  );
};


const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('suppliers');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showDieModal, setShowDieModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAlloySpecModal, setShowAlloySpecModal] = useState(false);
  const [showCostCentreModal, setShowCostCentreModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editType, setEditType] = useState<string>('');
  const [historyRecord, setHistoryRecord] = useState<any>(null);
  const [historyType, setHistoryType] = useState<string>('');
  const [deactivateRecord, setDeactivateRecord] = useState<any>(null);
  const [deactivateType, setDeactivateType] = useState<string>('');
  const [viewSupplier, setViewSupplier] = useState<any>(null);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewCustomer, setViewCustomer] = useState<any>(null);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [editMachine, setEditMachine] = useState<any>(null);
  const [editDie, setEditDie] = useState<any>(null);
  const [editLocation, setEditLocation] = useState<any>(null);
  const [editCostCentre, setEditCostCentre] = useState<any>(null);
  const [editPaymentTerms, setEditPaymentTerms] = useState<any>(null);
  const [editAlloySpec, setEditAlloySpec] = useState<any>(null);

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/api/suppliers').then(r => r.data.data) });
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });
  const { data: dies } = useQuery({ queryKey: ['dies'], queryFn: () => api.get('/api/dies').then(r => r.data.data) });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/api/customers').then(r => r.data.data) });
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/api/vendors').then(r => r.data.data) });
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.get('/api/locations').then(r => r.data.data) });
  const { data: alloySpecs } = useQuery({ queryKey: ['alloyGrades'], queryFn: () => api.get('/api/melt/alloy-grades').then(r => r.data.data) });
  const { data: costCentres } = useQuery({ queryKey: ['costCentres'], queryFn: () => api.get('/api/cost-centres').then(r => r.data.data) });
  const { data: paymentTermsList } = useQuery({ queryKey: ['paymentTerms'], queryFn: () => api.get('/api/payment-terms').then(r => r.data.data) });
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: () => api.get('/api/items').then(r => r.data.data) });

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
      {showCostCentreModal && <AddCostCentreModal onClose={() => setShowCostCentreModal(false)} />}
      {showItemModal && <AddItemModal onClose={() => setShowItemModal(false)} />}
      {showPaymentTermsModal && <AddPaymentTermsModal onClose={() => setShowPaymentTermsModal(false)} />}
      {historyRecord && <HistoryModal entity_type={historyType} record={historyRecord} onClose={() => setHistoryRecord(null)} />}
      {viewSupplier && !editSupplier && <SupplierDetailModal supplier={viewSupplier} onClose={() => setViewSupplier(null)} onEdit={() => { setEditSupplier(viewSupplier); setViewSupplier(null); }} />}
      {editSupplier && <EditSupplierModal supplier={editSupplier} onClose={() => setEditSupplier(null)} />}
      {viewItem && !editItem && <ItemDetailModal item={viewItem} onClose={() => setViewItem(null)} onEdit={() => { setEditItem(viewItem); setViewItem(null); }} />}
      {editItem && <EditItemModal item={editItem} onClose={() => setEditItem(null)} />}
      {viewCustomer && !editCustomer && <CustomerDetailModal customer={viewCustomer} onClose={() => setViewCustomer(null)} onEdit={() => { setEditCustomer(viewCustomer); setViewCustomer(null); }} />}
      {editCustomer && <EditCustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)} />}
      {editVendor && <EditVendorModal vendor={editVendor} onClose={() => setEditVendor(null)} />}
      {editMachine && <EditMachineModal machine={editMachine} onClose={() => setEditMachine(null)} />}
      {editDie && <EditDieModal die={editDie} onClose={() => setEditDie(null)} />}
      {editLocation && <EditLocationModal location={editLocation} onClose={() => setEditLocation(null)} />}
      {editCostCentre && <EditCostCentreModal costCentre={editCostCentre} onClose={() => setEditCostCentre(null)} />}
      {editPaymentTerms && <EditPaymentTermsModal paymentTerms={editPaymentTerms} onClose={() => setEditPaymentTerms(null)} />}
      {editAlloySpec && <EditAlloySpecModal spec={editAlloySpec} onClose={() => setEditAlloySpec(null)} />}
      {editAlloySpec && <EditAlloySpecModal spec={editAlloySpec} onClose={() => setEditAlloySpec(null)} />}
      {deactivateRecord && <DeactivateModal entity_type={deactivateType} record={deactivateRecord} onClose={() => setDeactivateRecord(null)} />}

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
        <MasterTable
          title="Item Master"
          data={(items || []).map((i: any) => ({ ...i, source_label: SOURCE_LABEL[i.source] || i.source || '—', lead_time_display: i.lead_time_days ? `${i.lead_time_days}d` : '—' }))}
          columns={[
            { key: 'item_code', label: 'Code' },
            { key: 'item_name', label: 'Name' },
            { key: 'item_type', label: 'Type' },
            { key: 'item_category', label: 'Category' },
            { key: 'source_label', label: 'Source' },
            { key: 'lead_time_display', label: 'Lead Time' },
            { key: 'is_active', label: 'Status' }
          ]}
          onAdd={() => setShowItemModal(true)}
          onEdit={(row: any) => setEditItem(row)}
          onHistory={(row: any) => { setHistoryRecord(row); setHistoryType('item'); }}
          onToggleStatus={(row: any) => { setDeactivateRecord(row); setDeactivateType('item'); }}
          onView={(row: any) => setViewItem(row)}
          searchFields={['item_code','item_name','item_category']}
          filterConfig={[
            { key: 'item_type', label: 'Type', options: ['raw_material','finished_goods','semi_finished','consumable','spare','tool','packaging'] },
            { key: 'source', label: 'Source', options: ['domestic','import_usa','import_europe','import_other','internal'] },
            { key: 'status', label: 'Status', options: ['active','inactive'] }
          ]}
        />
      )}

      {activeSection === 'payment_terms' && (
        <MasterTable
          title="Payment Terms"
          data={paymentTermsList || []}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'description', label: 'Description' },
            { key: 'days', label: 'Days' },
            { key: 'discount_percent', label: 'Discount %' },
            { key: 'is_active', label: 'Status' }
          ]}
          onAdd={() => setShowPaymentTermsModal(true)}
          onEdit={row => setEditPaymentTerms(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('payment_terms'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('payment_terms'); }}
          onView={row => setEditPaymentTerms(row)}
          searchFields={['code','description']}
          filterConfig={[{key:'status',label:'Status',options:['active','inactive']}]}
        />
      )}

      {activeSection === 'suppliers' && (
        <MasterTable
          title="Suppliers"
          data={suppliers || []}
          columns={[
            { key: 'supplier_code', label: 'Code' },
            { key: 'supplier_name', label: 'Name' },
            { key: 'contact_person', label: 'Contact' },
            { key: 'city', label: 'City' },
            { key: 'supplier_type', label: 'Type' },
            { key: 'is_active', label: 'Status' }
          ]}
          onAdd={() => setShowSupplierModal(true)}
          onEdit={row => setEditSupplier(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('supplier'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('supplier'); }}
          onView={row => setViewSupplier(row)}
          searchFields={['supplier_code','supplier_name','city']}
          filterConfig={[{key:'supplier_type',label:'Type',options:['direct','indirect']},{key:'status',label:'Status',options:['active','inactive']}]}
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
          onEdit={row => setEditMachine(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('machine'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('machine'); }}
          onView={row => setEditMachine(row)}
          searchFields={['machine_code','machine_name']}
          filterConfig={[{key:'machine_type',label:'Type',options:['furnace','die_casting','cnc','lathe','other']},{key:'status',label:'Status',options:['active','inactive']}]}
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
          onEdit={row => setEditDie(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('die'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('die'); }}
          onView={row => setEditDie(row)}
          searchFields={['die_number','die_name','die_owner']}
          filterConfig={[{key:'status',label:'Status',options:['active','inactive']}]}
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
          onEdit={row => setEditCustomer(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('customer'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('customer'); }}
          onView={row => setViewCustomer(row)}
          searchFields={['customer_code','customer_name','city']}
          filterConfig={[{key:'status',label:'Status',options:['active','inactive']}]}
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
          onEdit={row => setEditVendor(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('vendor'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('vendor'); }}
          onView={row => setEditVendor(row)}
          searchFields={['vendor_code','vendor_name']}
          filterConfig={[{key:'service_type',label:'Service',options:['machining','plating','heat_treatment','assembly','painting','other']},{key:'status',label:'Status',options:['active','inactive']}]}
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
          onEdit={row => setEditLocation(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('location'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('location'); }}
          onView={row => setEditLocation(row)}
          searchFields={['code','description','zone']}
          filterConfig={[{key:'location_type',label:'Type',options:['store','shop_floor']},{key:'status',label:'Status',options:['active','inactive']}]}
        />
      )}

      {activeSection === 'cost_centres' && (
        <MasterTable
          title="Cost Centres"
          data={costCentres || []}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'type', label: 'Type' },
            { key: 'budget_monthly', label: 'Budget/Month' },
            { key: 'is_active', label: 'Status' }
          ]}
          onAdd={() => setShowCostCentreModal(true)}
          onEdit={row => setEditCostCentre(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('cost_centre'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('cost_centre'); }}
          onView={row => setEditCostCentre(row)}
          searchFields={['code','name']}
          filterConfig={[{key:'type',label:'Type',options:['machine','department','project','overhead']},{key:'status',label:'Status',options:['active','inactive']}]}
        />
      )}

      {activeSection === 'alloy_specs' && (
        <MasterTable
          title="Alloy Chemistry Specs"
          data={(alloySpecs || []).map((g: any) => ({
            ...g,
            item_code: g.item?.item_code,
            item_name: g.item?.item_name,
            melt_range: g.melt_temp_min && g.melt_temp_max ? `${g.melt_temp_min}–${g.melt_temp_max}°C` : '—',
            transfer_range: g.transfer_temp_min && g.transfer_temp_max ? `${g.transfer_temp_min}–${g.transfer_temp_max}°C` : '—',
            key_limits: ['si','cu','fe'].filter(el => g[`${el}_max`]).map(el => `${el.toUpperCase()} ≤${g[`${el}_max`]}`).join(' | ') || '—'
          }))}
          columns={[
            { key: 'item_code', label: 'Item Code' },
            { key: 'item_name', label: 'Item Name' },
            { key: 'standard', label: 'Standard' },
            { key: 'alloy_system', label: 'System' },
            { key: 'melt_range', label: 'Melt Temp' },
            { key: 'transfer_range', label: 'Transfer Temp' },
            { key: 'key_limits', label: 'Key Limits' }
          ]}
          onAdd={() => setShowAlloySpecModal(true)}
          onEdit={row => setEditAlloySpec(row)}
          onHistory={row => { setHistoryRecord(row); setHistoryType('alloy_spec'); }}
          onToggleStatus={row => { setDeactivateRecord(row); setDeactivateType('alloy_spec'); }}
          onView={row => setEditAlloySpec(row)}
          searchFields={['item_code','item_name','standard']}
          filterConfig={[{key:'alloy_system',label:'System',options:['Al-Si','Al-Cu','Al-Mg','Al-Zn','Zn','Other']},{key:'status',label:'Status',options:['active','inactive']}]}
        />
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
          {mutation.isError && <p className="text-red-500 text-sm">{(mutation.error as any)?.response?.data?.error || 'Failed to add alloy spec'}</p>}
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
  const [form, setForm] = useState({ name: '', type: 'department', machine_id: '' });
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
          <div className="bg-surface rounded-lg p-2 text-xs text-text-secondary">Code auto-generated as CC-TYPE-NNNN</div>
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
              disabled={!form.name || mutation.isPending}
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
    item_name: '', item_type: 'raw_material', item_category: '',
    unit_of_measure: 'KG', hsn_code: '', purchase_type: 'direct',
    source: 'domestic', lead_time_days: '',
    reorder_point: '', safety_stock: '', order_quantity: '', description: ''
  });
  const categories = ITEM_CATEGORIES[form.item_type] || [];
  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/api/items', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['items'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Add Item</h2><p className="text-xs text-text-secondary mt-0.5">Code auto-generated as TYPE-NAME-NNNN</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Item Name <span className="text-red-500">*</span></label>
              <input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className={cls} placeholder="e.g. Aluminium Ingot ADC12" /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Item Type <span className="text-red-500">*</span></label>
              <select value={form.item_type} onChange={e => setForm({...form, item_type: e.target.value, item_category: ''})} className={cls}>
                {['raw_material','finished_goods','semi_finished','consumable','spare','tool','packaging'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Category <span className="text-red-500">*</span></label>
              <select value={form.item_category} onChange={e => setForm({...form, item_category: e.target.value})} className={cls}>
                <option value="">Select category...</option>
                {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select></div>
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
            <div><label className="block text-xs text-text-secondary mb-1">Source <span className="text-red-500">*</span></label>
              <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className={cls}>
                {SOURCE_OPTIONS.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Lead Time (days)</label>
              <input type="number" value={form.lead_time_days} onChange={e => setForm({...form, lead_time_days: e.target.value})} className={cls} placeholder="e.g. 7" /></div>
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
          {mutation.isError && <p className="text-red-500 text-sm">{(mutation.error as any)?.response?.data?.error || 'Failed to add item'}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null, reorder_point: form.reorder_point ? parseFloat(form.reorder_point) : null, safety_stock: form.safety_stock ? parseFloat(form.safety_stock) : null, order_quantity: form.order_quantity ? parseFloat(form.order_quantity) : null})}
              disabled={!form.item_name || !form.item_category || mutation.isPending}
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
  const [form, setForm] = useState({ description: '', days: '30', discount_percent: '', discount_days: '' });
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
          <div className="bg-surface rounded-lg p-2 text-xs text-text-secondary">Code auto-generated: NET30, NET30D2-10, ADV, COD</div>
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
            <button onClick={() => mutation.mutate({ description: form.description, days: parseInt(form.days), discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null, discount_days: form.discount_days ? parseInt(form.discount_days) : null })}
              disabled={!form.description || !form.days || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add Terms'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const HistoryModal: React.FC<{ entity_type: string; record: any; onClose: () => void }> = ({ entity_type, record, onClose }) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit', entity_type, record.id],
    queryFn: () => api.get(`/api/audit/${entity_type}/${record.id}`).then(r => r.data.data)
  });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Change History</h2>
            <p className="text-xs text-text-secondary mt-0.5">{record.supplier_code || record.item_code || record.customer_code || record.vendor_code || record.machine_code || record.code || record.die_number || record.name}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5">
          {isLoading && <p className="text-text-secondary text-sm">Loading...</p>}
          {(!logs || logs.length === 0) && !isLoading && <p className="text-text-secondary text-sm">No changes recorded yet.</p>}
          {logs?.map((log: any) => (
            <div key={log.id} className="border border-border rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.action === 'create' ? 'bg-green-50 text-green-600' : log.action === 'deactivate' ? 'bg-red-50 text-red-500' : log.action === 'activate' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{log.action}</span>
                <span className="text-xs text-text-secondary">{new Date(log.changed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
              <p className="text-xs text-text-secondary mb-1">By: <span className="font-medium text-text-primary">{log.changed_by_email || '—'}</span></p>
              {log.reason && <p className="text-xs text-amber-600 mb-1">Reason: {log.reason}</p>}
              {log.changed_fields && log.changed_fields.length > 0 && (
                <div className="mt-2 space-y-1">
                  {log.changed_fields.map((f: any, i: number) => (
                    <div key={i} className="text-xs grid grid-cols-3 gap-2 bg-surface rounded p-1.5">
                      <span className="font-medium text-text-primary">{f.field}</span>
                      <span className="text-red-500 line-through">{String(f.old_value ?? '—')}</span>
                      <span className="text-green-600">{String(f.new_value ?? '—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DeactivateModal: React.FC<{ entity_type: string; record: any; onClose: () => void }> = ({ entity_type, record, onClose }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const isActive = record.is_active;
  const endpointMap: Record<string, string> = {
    supplier: 'suppliers', item: 'items', customer: 'customers', vendor: 'vendors',
    machine: 'machines', die: 'dies', location: 'locations', cost_centre: 'cost-centres', payment_terms: 'payment-terms', alloy_spec: 'melt/alloy-grades'
  };
  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/${endpointMap[entity_type]}/${record.id}/status`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [entity_type + 's'] }); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); queryClient.invalidateQueries({ queryKey: ['items'] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); queryClient.invalidateQueries({ queryKey: ['vendors'] }); queryClient.invalidateQueries({ queryKey: ['machines'] }); queryClient.invalidateQueries({ queryKey: ['dies'] }); queryClient.invalidateQueries({ queryKey: ['locations'] }); queryClient.invalidateQueries({ queryKey: ['costCentres'] }); queryClient.invalidateQueries({ queryKey: ['paymentTerms'] }); queryClient.invalidateQueries({ queryKey: ['alloyGrades'] }); onClose(); }
  });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">{isActive ? 'Deactivate' : 'Activate'} Record</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-text-primary">You are about to <strong>{isActive ? 'deactivate' : 'activate'}</strong> this record. A reason is required.</p>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder={isActive ? 'e.g. Supplier not responding, found better alternative' : 'e.g. Supplier reinstated after quality audit'} />
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update status</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${isActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}>
              {mutation.isPending ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const SupplierDetailModal: React.FC<{ supplier: any; onClose: () => void; onEdit: () => void }> = ({ supplier, onClose, onEdit }) => {
  const cls = "text-sm text-text-primary";
  const label = "text-xs text-text-secondary mb-0.5";
  const field = (l: string, v: any) => (
    <div><p className={label}>{l}</p><p className={cls}>{v || '—'}</p></div>
  );
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">{supplier.supplier_name}</h2>
            <p className="text-xs text-brand-primary font-medium mt-0.5">{supplier.supplier_code}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-medium hover:bg-brand-dark">✏️ Edit</button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {field('Supplier Type', supplier.supplier_type)}
            {field('Status', supplier.is_active ? '✅ Active' : '🔴 Inactive')}
            {field('Rating', supplier.rating ? `${supplier.rating}/5` : '—')}
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-text-primary mb-2">Contact</p>
            <div className="grid grid-cols-3 gap-4">
              {field('Contact Person', supplier.contact_person)}
              {field('Phone', supplier.contact_phone)}
              {field('Email', supplier.contact_email)}
              {field('City', supplier.city)}
              {field('State', supplier.state)}
              {field('GSTIN', supplier.gstin)}
            </div>
            {supplier.address && <div className="mt-2">{field('Address', supplier.address)}</div>}
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-text-primary mb-2">Commercial</p>
            <div className="grid grid-cols-3 gap-4">
              {field('Payment Terms', supplier.payment_terms_ref ? `${supplier.payment_terms_ref.code} — ${supplier.payment_terms_ref.description}` : supplier.payment_terms || '—')}
              {field('Lead Time', supplier.lead_time_days ? `${supplier.lead_time_days} days` : '—')}
              {field('Credit Limit', supplier.credit_limit ? `₹${supplier.credit_limit.toLocaleString('en-IN')}` : '—')}
            </div>
          </div>
          {(supplier.bank_name || supplier.bank_account) && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-text-primary mb-2">Bank Details</p>
              <div className="grid grid-cols-3 gap-4">
                {field('Bank', supplier.bank_name)}
                {field('Account No', supplier.bank_account)}
                {field('IFSC', supplier.bank_ifsc)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditSupplierModal: React.FC<{ supplier: any; onClose: () => void }> = ({ supplier, onClose }) => {
  const queryClient = useQueryClient();
  const { data: paymentTermsList } = useQuery({ queryKey: ['paymentTerms'], queryFn: () => api.get('/api/payment-terms').then(r => r.data.data) });
  const [form, setForm] = useState<any>({
    supplier_name: supplier.supplier_name || '',
    supplier_type: supplier.supplier_type || 'direct',
    contact_person: supplier.contact_person || '',
    contact_email: supplier.contact_email || '',
    contact_phone: supplier.contact_phone || '',
    address: supplier.address || '',
    city: supplier.city || '',
    state: supplier.state || '',
    gstin: supplier.gstin || '',
    payment_terms_id: supplier.payment_terms_id || '',
    payment_days: supplier.payment_days || 30,
    credit_limit: supplier.credit_limit || '',
    lead_time_days: supplier.lead_time_days || '',
    bank_name: supplier.bank_name || '',
    bank_account: supplier.bank_account || '',
    bank_ifsc: supplier.bank_ifsc || '',
    rating: supplier.rating || '',
    reason: ''
  });
  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/suppliers/${supplier.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Supplier</h2>
            <p className="text-xs text-brand-primary font-medium">{supplier.supplier_code}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Supplier Name <span className="text-red-500">*</span></label>
              <input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Phone</label>
              <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Email</label>
              <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">GSTIN</label>
              <input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">City</label>
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">State</label>
              <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Payment Terms</label>
              <select value={form.payment_terms_id} onChange={e => setForm({...form, payment_terms_id: e.target.value})} className={cls}>
                <option value="">Select...</option>
                {paymentTermsList?.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.code} — {pt.description}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Lead Time (days)</label>
              <input type="number" value={form.lead_time_days} onChange={e => setForm({...form, lead_time_days: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Credit Limit (₹)</label>
              <input type="number" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Rating (1-5)</label>
              <input type="number" min="1" max="5" step="0.1" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})} className={cls} /></div>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-xs font-medium text-text-primary mb-2">Bank Details</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-text-secondary mb-1">Bank Name</label>
                <input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className={cls} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Account No</label>
                <input value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})} className={cls} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">IFSC</label>
                <input value={form.bank_ifsc} onChange={e => setForm({...form, bank_ifsc: e.target.value.toUpperCase()})} className={cls} /></div>
            </div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason for change <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} placeholder="e.g. Updated bank details after supplier communication" /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update supplier</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null, credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null, rating: form.rating ? parseFloat(form.rating) : null})}
              disabled={!form.supplier_name || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const ItemDetailModal: React.FC<{ item: any; onClose: () => void; onEdit: () => void }> = ({ item, onClose, onEdit }) => {
  const label = "text-xs text-text-secondary mb-0.5";
  const cls = "text-sm text-text-primary";
  const field = (l: string, v: any) => <div><p className={label}>{l}</p><p className={cls}>{v || '—'}</p></div>;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">{item.item_name}</h2>
            <p className="text-xs text-brand-primary font-medium mt-0.5">{item.item_code}</p></div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-medium hover:bg-brand-dark">✏️ Edit</button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {field('Type', item.item_type?.replace(/_/g,' '))}
            {field('Category', item.item_category)}
            {field('UOM', item.unit_of_measure)}
            {field('HSN Code', item.hsn_code)}
            {field('Purchase Type', item.purchase_type)}
            {field('Status', item.is_active ? '✅ Active' : '🔴 Inactive')}
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-text-primary mb-2">Costs</p>
            <div className="grid grid-cols-3 gap-4">
              {field('Benchmark Cost', item.benchmark_cost ? `₹${item.benchmark_cost}/UOM` : '—')}
              {field('Selling Price', item.selling_price ? `₹${item.selling_price}` : '—')}
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-text-primary mb-2">Stock Control</p>
            <div className="grid grid-cols-3 gap-4">
              {field('Reorder Point', item.reorder_point ? `${item.reorder_point} ${item.unit_of_measure}` : '—')}
              {field('Safety Stock', item.safety_stock ? `${item.safety_stock} ${item.unit_of_measure}` : '—')}
              {field('Order Quantity', item.order_quantity ? `${item.order_quantity} ${item.unit_of_measure}` : '—')}
            </div>
          </div>
          {item.description && <div className="border-t border-border pt-3">{field('Description', item.description)}</div>}
        </div>
      </div>
    </div>
  );
};

const EditItemModal: React.FC<{ item: any; onClose: () => void }> = ({ item, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    item_name: item.item_name || '', item_category: item.item_category || '',
    unit_of_measure: item.unit_of_measure || 'KG', hsn_code: item.hsn_code || '',
    purchase_type: item.purchase_type || 'direct', source: item.source || 'domestic',
    lead_time_days: item.lead_time_days || '',
    reorder_point: item.reorder_point || '', safety_stock: item.safety_stock || '',
    order_quantity: item.order_quantity || '', description: item.description || '',
    reason: ''
  });
  const categories = ITEM_CATEGORIES[item.item_type] || [];
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/items/${item.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['items'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Item</h2>
            <p className="text-xs text-brand-primary font-medium">{item.item_code} — {item.item_type?.replace(/_/g,' ')}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Item Name <span className="text-red-500">*</span></label>
              <input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Category</label>
              <select value={form.item_category} onChange={e => setForm({...form, item_category: e.target.value})} className={cls}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">UOM</label>
              <select value={form.unit_of_measure} onChange={e => setForm({...form, unit_of_measure: e.target.value})} className={cls}>
                {['KG','NOS','LTR','MTR','SQM','SET','BOX','PKT'].map(u => <option key={u}>{u}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">HSN Code</label>
              <input value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Source</label>
              <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className={cls}>
                {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Lead Time (days)</label>
              <input type="number" value={form.lead_time_days} onChange={e => setForm({...form, lead_time_days: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Purchase Type</label>
              <select value={form.purchase_type} onChange={e => setForm({...form, purchase_type: e.target.value})} className={cls}>
                <option value="direct">Direct</option><option value="indirect">Indirect</option>
              </select></div>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-xs font-medium text-text-primary mb-2">Stock Control</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-text-secondary mb-1">Reorder Point</label>
                <input type="number" value={form.reorder_point} onChange={e => setForm({...form, reorder_point: e.target.value})} className={cls} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Safety Stock</label>
                <input type="number" value={form.safety_stock} onChange={e => setForm({...form, safety_stock: e.target.value})} className={cls} /></div>
              <div><label className="block text-xs text-text-secondary mb-1">Order Qty</label>
                <input type="number" value={form.order_quantity} onChange={e => setForm({...form, order_quantity: e.target.value})} className={cls} /></div>
            </div>
          </div>

          <div><label className="block text-xs text-text-secondary mb-1">Reason for change <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update item</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null, reorder_point: form.reorder_point ? parseFloat(form.reorder_point) : null, safety_stock: form.safety_stock ? parseFloat(form.safety_stock) : null, order_quantity: form.order_quantity ? parseFloat(form.order_quantity) : null})}
              disabled={!form.item_name || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerDetailModal: React.FC<{ customer: any; onClose: () => void; onEdit: () => void }> = ({ customer, onClose, onEdit }) => {
  const label = "text-xs text-text-secondary mb-0.5";
  const cls = "text-sm text-text-primary";
  const field = (l: string, v: any) => <div><p className={label}>{l}</p><p className={cls}>{v || '—'}</p></div>;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">{customer.customer_name}</h2>
            <p className="text-xs text-brand-primary font-medium">{customer.customer_code}</p></div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-medium">✏️ Edit</button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {field('Contact Person', customer.contact_person)}
          {field('Phone', customer.contact_phone)}
          {field('Email', customer.contact_email)}
          {field('GSTIN', customer.gstin)}
          {field('City', customer.city)}
          {field('State', customer.state)}
          {field('Payment Terms', customer.payment_terms)}
          {field('Status', customer.is_active !== false ? '✅ Active' : '🔴 Inactive')}
          {customer.address && <div className="col-span-2">{field('Address', customer.address)}</div>}
        </div>
      </div>
    </div>
  );
};

const EditCustomerModal: React.FC<{ customer: any; onClose: () => void }> = ({ customer, onClose }) => {
  const queryClient = useQueryClient();
  const { data: paymentTermsList } = useQuery({ queryKey: ['paymentTerms'], queryFn: () => api.get('/api/payment-terms').then(r => r.data.data) });
  const [form, setForm] = useState<any>({ customer_name: customer.customer_name || '', contact_person: customer.contact_person || '', contact_phone: customer.contact_phone || '', contact_email: customer.contact_email || '', address: customer.address || '', city: customer.city || '', state: customer.state || '', gstin: customer.gstin || '', payment_terms_id: customer.payment_terms_id || '', reason: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/customers/${customer.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Customer</h2><p className="text-xs text-brand-primary">{customer.customer_code}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Customer Name <span className="text-red-500">*</span></label>
              <input value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Contact Person</label><input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Phone</label><input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Email</label><input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">GSTIN</label><input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">City</label><input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">State</label><input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className={cls} /></div>
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Payment Terms</label>
              <select value={form.payment_terms_id} onChange={e => setForm({...form, payment_terms_id: e.target.value})} className={cls}>
                <option value="">Select...</option>
                {paymentTermsList?.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.code} — {pt.description}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.customer_name || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditVendorModal: React.FC<{ vendor: any; onClose: () => void }> = ({ vendor, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({ vendor_name: vendor.vendor_name || '', service_type: vendor.service_type || 'machining', contact_person: vendor.contact_person || '', contact_phone: vendor.contact_phone || '', contact_email: vendor.contact_email || '', city: vendor.city || '', state: vendor.state || '', gstin: vendor.gstin || '', lead_time_days: vendor.lead_time_days || '', reason: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/vendors/${vendor.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Vendor</h2><p className="text-xs text-brand-primary">{vendor.vendor_code}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Vendor Name <span className="text-red-500">*</span></label>
              <input value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Service Type</label>
              <select value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className={cls}>
                {['machining','plating','heat_treatment','assembly','painting','shot_blast','fettling','other'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Contact Person</label><input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Phone</label><input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">City</label><input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Lead Time (days)</label><input type="number" value={form.lead_time_days} onChange={e => setForm({...form, lead_time_days: e.target.value})} className={cls} /></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null})} disabled={!form.vendor_name || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditMachineModal: React.FC<{ machine: any; onClose: () => void }> = ({ machine, onClose }) => {
  const queryClient = useQueryClient();
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.get('/api/locations').then(r => r.data.data) });
  const [form, setForm] = useState<any>({ machine_name: machine.machine_name || '', machine_type: machine.machine_type || '', capacity_tons: machine.capacity_tons || '', rated_cycle_time_sec: machine.rated_cycle_time_sec || '', oee_target_percent: machine.oee_target_percent || '', power_kw: machine.power_kw || '', location: machine.location || '', cost_per_hour: machine.cost_per_hour || '', reason: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/machines/${machine.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['machines'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Machine</h2><p className="text-xs text-brand-primary">{machine.machine_code}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Machine Name <span className="text-red-500">*</span></label>
              <input value={form.machine_name} onChange={e => setForm({...form, machine_name: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Capacity (tons)</label>
              <input type="number" value={form.capacity_tons} onChange={e => setForm({...form, capacity_tons: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Cycle Time (sec)</label>
              <input type="number" value={form.rated_cycle_time_sec} onChange={e => setForm({...form, rated_cycle_time_sec: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">OEE Target (%)</label>
              <input type="number" value={form.oee_target_percent} onChange={e => setForm({...form, oee_target_percent: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Power (kW)</label>
              <input type="number" value={form.power_kw} onChange={e => setForm({...form, power_kw: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Cost per Hour (₹)</label>
              <input type="number" value={form.cost_per_hour} onChange={e => setForm({...form, cost_per_hour: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Location</label>
              <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className={cls}>
                <option value="">Select...</option>
                {locations?.map((l: any) => <option key={l.id} value={l.code}>{l.code}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, capacity_tons: form.capacity_tons ? parseFloat(form.capacity_tons) : null, rated_cycle_time_sec: form.rated_cycle_time_sec ? parseInt(form.rated_cycle_time_sec) : null, oee_target_percent: form.oee_target_percent ? parseFloat(form.oee_target_percent) : null, power_kw: form.power_kw ? parseFloat(form.power_kw) : null, cost_per_hour: form.cost_per_hour ? parseFloat(form.cost_per_hour) : null})}
              disabled={!form.machine_name || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditDieModal: React.FC<{ die: any; onClose: () => void }> = ({ die, onClose }) => {
  const queryClient = useQueryClient();
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });
  const [form, setForm] = useState<any>({ die_name: die.die_name || '', cavity_count: die.cavity_count || 1, design_life_shots: die.design_life_shots || '', pm_interval_shots: die.pm_interval_shots || '', die_owner: die.die_owner || '', machine_id: die.machine_id || '', reason: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/dies/${die.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dies'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Die</h2><p className="text-xs text-brand-primary">{die.die_number}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Die Name <span className="text-red-500">*</span></label>
              <input value={form.die_name} onChange={e => setForm({...form, die_name: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Cavities</label>
              <input type="number" value={form.cavity_count} onChange={e => setForm({...form, cavity_count: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Design Life (shots)</label>
              <input type="number" value={form.design_life_shots} onChange={e => setForm({...form, design_life_shots: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">PM Interval (shots)</label>
              <input type="number" value={form.pm_interval_shots} onChange={e => setForm({...form, pm_interval_shots: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Die Owner</label>
              <input value={form.die_owner} onChange={e => setForm({...form, die_owner: e.target.value})} className={cls} /></div>
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Machine</label>
              <select value={form.machine_id} onChange={e => setForm({...form, machine_id: e.target.value})} className={cls}>
                <option value="">Select...</option>
                {machines?.filter((m: any) => m.machine_type !== 'furnace').map((m: any) => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, cavity_count: parseInt(form.cavity_count), design_life_shots: form.design_life_shots ? parseInt(form.design_life_shots) : null, pm_interval_shots: form.pm_interval_shots ? parseInt(form.pm_interval_shots) : null, machine_id: form.machine_id || null})}
              disabled={!form.die_name || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditLocationModal: React.FC<{ location: any; onClose: () => void }> = ({ location, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({ description: location.description || '', zone: location.zone || '', location_type: location.location_type || '', capacity_kg: location.capacity_kg || '', rack_count: location.rack_count || '', bin_count: location.bin_count || '', reason: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/locations/${location.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Location</h2><p className="text-xs text-brand-primary">{location.code}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Zone</label>
              <input value={form.zone} onChange={e => setForm({...form, zone: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Capacity (kg)</label>
              <input type="number" value={form.capacity_kg} onChange={e => setForm({...form, capacity_kg: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Rack Count</label>
              <input type="number" value={form.rack_count} onChange={e => setForm({...form, rack_count: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Bin Count</label>
              <input type="number" value={form.bin_count} onChange={e => setForm({...form, bin_count: e.target.value})} className={cls} /></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, capacity_kg: form.capacity_kg ? parseFloat(form.capacity_kg) : null, rack_count: form.rack_count ? parseInt(form.rack_count) : null, bin_count: form.bin_count ? parseInt(form.bin_count) : null})}
              disabled={!form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditCostCentreModal: React.FC<{ costCentre: any; onClose: () => void }> = ({ costCentre, onClose }) => {
  const queryClient = useQueryClient();
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: () => api.get('/api/machines').then(r => r.data.data) });
  const [form, setForm] = useState<any>({ name: costCentre.name || '', type: costCentre.type || 'department', machine_id: costCentre.machine_id || '', budget_monthly: costCentre.budget_monthly || '', department_head: costCentre.department_head || '', reason: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/cost-centres/${costCentre.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['costCentres'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Cost Centre</h2><p className="text-xs text-brand-primary">{costCentre.code}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-text-secondary mb-1">Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={cls}>
                {['machine','department','project','overhead'].map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="block text-xs text-text-secondary mb-1">Monthly Budget (₹)</label>
              <input type="number" value={form.budget_monthly} onChange={e => setForm({...form, budget_monthly: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Department Head</label>
              <input value={form.department_head} onChange={e => setForm({...form, department_head: e.target.value})} className={cls} /></div>
            {form.type === 'machine' && <div><label className="block text-xs text-text-secondary mb-1">Machine</label>
              <select value={form.machine_id} onChange={e => setForm({...form, machine_id: e.target.value})} className={cls}>
                <option value="">Select...</option>
                {machines?.map((m: any) => <option key={m.id} value={m.id}>{m.machine_code}</option>)}
              </select></div>}
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({...form, machine_id: form.machine_id || null, budget_monthly: form.budget_monthly ? parseFloat(form.budget_monthly) : null})}
              disabled={!form.name || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditPaymentTermsModal: React.FC<{ paymentTerms: any; onClose: () => void }> = ({ paymentTerms, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({ description: paymentTerms.description || '', days: paymentTerms.days || 30, discount_percent: paymentTerms.discount_percent || '', discount_days: paymentTerms.discount_days || '', reason: '' });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/payment-terms/${paymentTerms.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['paymentTerms'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Payment Terms</h2><p className="text-xs text-brand-primary">{paymentTerms.code}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-xs text-text-secondary mb-1">Description <span className="text-red-500">*</span></label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={cls} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-text-secondary mb-1">Days</label>
              <input type="number" value={form.days} onChange={e => setForm({...form, days: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Discount %</label>
              <input type="number" step="0.1" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Discount Days</label>
              <input type="number" value={form.discount_days} onChange={e => setForm({...form, discount_days: e.target.value})} className={cls} /></div>
          </div>
          <div><label className="block text-xs text-text-secondary mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className={cls} /></div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={() => mutation.mutate({ description: form.description, days: parseInt(form.days), discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null, discount_days: form.discount_days ? parseInt(form.discount_days) : null, reason: form.reason })}
              disabled={!form.description || !form.reason || mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditAlloySpecModal: React.FC<{ spec: any; onClose: () => void }> = ({ spec, onClose }) => {
  const queryClient = useQueryClient();
  const elements = ['si', 'cu', 'fe', 'mn', 'mg', 'ni', 'zn', 'sn', 'ti', 'pb'];
  const [form, setForm] = useState<any>({
    standard: spec.standard || '', alloy_system: spec.alloy_system || 'Al-Si',
    melt_temp_min: spec.melt_temp_min || '', melt_temp_max: spec.melt_temp_max || '',
    transfer_temp_min: spec.transfer_temp_min || '', transfer_temp_max: spec.transfer_temp_max || '',
    pouring_temp_min: spec.pouring_temp_min || '', pouring_temp_max: spec.pouring_temp_max || '',
    ...Object.fromEntries(elements.flatMap(el => [[`${el}_min`, spec[`${el}_min`] || ''], [`${el}_max`, spec[`${el}_max`] || '']]))
  });
  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/api/melt/alloy-grades/${spec.id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alloyGrades'] }); onClose(); }
  });
  const cls = "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
  const clsXs = "w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary";
  const handleSave = () => {
    const data: any = {};
    Object.keys(form).forEach(k => { data[k] = form[k] !== '' ? parseFloat(form[k]) || form[k] : null; });
    mutation.mutate(data);
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><h2 className="font-bold text-text-primary">Edit Alloy Spec</h2>
            <p className="text-xs text-brand-primary">{spec.item?.item_code} — {spec.item?.item_name}</p></div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-secondary mb-1">Standard</label>
              <input value={form.standard} onChange={e => setForm({...form, standard: e.target.value})} className={cls} /></div>
            <div><label className="block text-xs text-text-secondary mb-1">Alloy System</label>
              <select value={form.alloy_system} onChange={e => setForm({...form, alloy_system: e.target.value})} className={cls}>
                {['Al-Si','Al-Cu','Al-Mg','Al-Zn','Zn','Other'].map(s => <option key={s}>{s}</option>)}
              </select></div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-2">Chemistry Spec (% by weight)</p>
            <div className="grid grid-cols-5 gap-2">
              {elements.map(el => (
                <div key={el} className="space-y-1">
                  <p className="text-xs text-center font-medium text-text-secondary uppercase">{el}</p>
                  <input type="number" step="0.01" placeholder="min" value={form[`${el}_min`]} onChange={e => setForm({...form, [`${el}_min`]: e.target.value})} className={clsXs} />
                  <input type="number" step="0.01" placeholder="max" value={form[`${el}_max`]} onChange={e => setForm({...form, [`${el}_max`]: e.target.value})} className={clsXs} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-2">Temperature Spec (°C)</p>
            <div className="grid grid-cols-3 gap-3">
              {[['melt_temp', 'Melt Temp'], ['transfer_temp', 'Transfer Temp'], ['pouring_temp', 'Pouring Temp']].map(([key, label]) => (
                <div key={key}>
                  <p className="text-xs text-text-secondary mb-1">{label}</p>
                  <div className="flex gap-1">
                    <input type="number" placeholder="min" value={form[`${key}_min`]} onChange={e => setForm({...form, [`${key}_min`]: e.target.value})} className={clsXs} />
                    <input type="number" placeholder="max" value={form[`${key}_max`]} onChange={e => setForm({...form, [`${key}_max`]: e.target.value})} className={clsXs} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update alloy spec</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">Cancel</button>
            <button onClick={handleSave} disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};




export default Settings;
