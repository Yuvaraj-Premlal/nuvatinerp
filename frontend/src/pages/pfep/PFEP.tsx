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

const AddItemModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    item_code: '',
    item_name: '',
    item_type: 'raw_material',
    unit_of_measure: 'KG',
    description: '',
    selling_price: '',
    material_cost: ''
  });
  const [pfep, setPfep] = useState({
    storage_location: '',
    rack_address: '',
    reorder_point: '',
    safety_stock: '',
    max_stock: '',
    lead_time_days: '',
    gross_weight_kg: '',
    net_weight_kg: '',
    yield_percent: '',
    abc_classification: 'A'
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const item = await api.post('/api/items', data.item);
      await api.post('/api/pfep', { item_id: item.data.data.id, ...data.pfep });
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      item: {
        ...form,
        selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
        material_cost: form.material_cost ? parseFloat(form.material_cost) : null
      },
      pfep: {
        ...pfep,
        reorder_point: pfep.reorder_point ? parseFloat(pfep.reorder_point) : null,
        safety_stock: pfep.safety_stock ? parseFloat(pfep.safety_stock) : null,
        max_stock: pfep.max_stock ? parseFloat(pfep.max_stock) : null,
        lead_time_days: pfep.lead_time_days ? parseInt(pfep.lead_time_days) : null,
        gross_weight_kg: pfep.gross_weight_kg ? parseFloat(pfep.gross_weight_kg) : null,
        net_weight_kg: pfep.net_weight_kg ? parseFloat(pfep.net_weight_kg) : null,
        yield_percent: pfep.yield_percent ? parseFloat(pfep.yield_percent) : null
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Add Item to PFEP</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-brand-primary mb-3 uppercase tracking-wider">Item Master</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Item Code</label>
                <input
                  value={form.item_code}
                  onChange={e => setForm({ ...form, item_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="e.g. RM-ADC12"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Item Name</label>
                <input
                  value={form.item_name}
                  onChange={e => setForm({ ...form, item_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Full item name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Item Type</label>
                <select
                  value={form.item_type}
                  onChange={e => setForm({ ...form, item_type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="raw_material">Raw Material</option>
                  <option value="finished_goods">Finished Goods</option>
                  <option value="consumable">Consumable</option>
                  <option value="packing">Packing Material</option>
                  <option value="spare">Spare Part</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Unit of Measure</label>
                <select
                  value={form.unit_of_measure}
                  onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option>KG</option>
                  <option>MT</option>
                  <option>PCS</option>
                  <option>LTR</option>
                  <option>NOS</option>
                  <option>SET</option>
                </select>
              </div>
              {form.item_type === 'finished_goods' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      value={form.selling_price}
                      onChange={e => setForm({ ...form, selling_price: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      placeholder="Per piece"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Material Cost (₹)</label>
                    <input
                      type="number"
                      value={form.material_cost}
                      onChange={e => setForm({ ...form, material_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      placeholder="Variable cost per piece"
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Optional description"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brand-primary mb-3 uppercase tracking-wider">PFEP Detail</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Storage Location</label>
                <input
                  value={pfep.storage_location}
                  onChange={e => setPfep({ ...pfep, storage_location: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="e.g. RM Bay"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Rack Address</label>
                <input
                  value={pfep.rack_address}
                  onChange={e => setPfep({ ...pfep, rack_address: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="e.g. R-3 / B-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Safety Stock</label>
                <input
                  type="number"
                  value={pfep.safety_stock}
                  onChange={e => setPfep({ ...pfep, safety_stock: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Minimum stock level"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Reorder Point</label>
                <input
                  type="number"
                  value={pfep.reorder_point}
                  onChange={e => setPfep({ ...pfep, reorder_point: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Trigger reorder at"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Max Stock</label>
                <input
                  type="number"
                  value={pfep.max_stock}
                  onChange={e => setPfep({ ...pfep, max_stock: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Maximum stock level"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Lead Time (days)</label>
                <input
                  type="number"
                  value={pfep.lead_time_days}
                  onChange={e => setPfep({ ...pfep, lead_time_days: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Supplier lead time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Gross Weight (kg)</label>
                <input
                  type="number"
                  value={pfep.gross_weight_kg}
                  onChange={e => setPfep({ ...pfep, gross_weight_kg: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Including runner and flash"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Net Weight (kg)</label>
                <input
                  type="number"
                  value={pfep.net_weight_kg}
                  onChange={e => setPfep({ ...pfep, net_weight_kg: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Final part weight"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Yield %</label>
                <input
                  type="number"
                  value={pfep.yield_percent}
                  onChange={e => setPfep({ ...pfep, yield_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="e.g. 85"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">ABC Classification</label>
                <select
                  value={pfep.abc_classification}
                  onChange={e => setPfep({ ...pfep, abc_classification: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="A">A — High value / critical</option>
                  <option value="B">B — Medium value</option>
                  <option value="C">C — Low value</option>
                </select>
              </div>
            </div>
          </div>

          {mutation.isError && <p className="text-red-500 text-sm">Failed to add item</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Adding...' : 'Add to PFEP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditPFEPModal: React.FC<{ item: any; onClose: () => void }> = ({ item, onClose }) => {
  const queryClient = useQueryClient();
  const [pfep, setPfep] = useState({
    storage_location: item.pfep_detail?.storage_location || '',
    rack_address: item.pfep_detail?.rack_address || '',
    reorder_point: item.pfep_detail?.reorder_point || '',
    safety_stock: item.pfep_detail?.safety_stock || '',
    max_stock: item.pfep_detail?.max_stock || '',
    lead_time_days: item.pfep_detail?.lead_time_days || '',
    gross_weight_kg: item.pfep_detail?.gross_weight_kg || '',
    net_weight_kg: item.pfep_detail?.net_weight_kg || '',
    yield_percent: item.pfep_detail?.yield_percent || '',
    abc_classification: item.pfep_detail?.abc_classification || 'A'
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/pfep/${item.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...pfep,
      reorder_point: pfep.reorder_point ? parseFloat(String(pfep.reorder_point)) : null,
      safety_stock: pfep.safety_stock ? parseFloat(String(pfep.safety_stock)) : null,
      max_stock: pfep.max_stock ? parseFloat(String(pfep.max_stock)) : null,
      lead_time_days: pfep.lead_time_days ? parseInt(String(pfep.lead_time_days)) : null,
      gross_weight_kg: pfep.gross_weight_kg ? parseFloat(String(pfep.gross_weight_kg)) : null,
      net_weight_kg: pfep.net_weight_kg ? parseFloat(String(pfep.net_weight_kg)) : null,
      yield_percent: pfep.yield_percent ? parseFloat(String(pfep.yield_percent)) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary">Edit PFEP Detail</h2>
            <p className="text-text-secondary text-sm">{item.item_name} — {item.item_code}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Storage Location</label>
              <input
                value={pfep.storage_location}
                onChange={e => setPfep({ ...pfep, storage_location: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Rack Address</label>
              <input
                value={pfep.rack_address}
                onChange={e => setPfep({ ...pfep, rack_address: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Safety Stock</label>
              <input
                type="number"
                value={pfep.safety_stock}
                onChange={e => setPfep({ ...pfep, safety_stock: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Reorder Point</label>
              <input
                type="number"
                value={pfep.reorder_point}
                onChange={e => setPfep({ ...pfep, reorder_point: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Max Stock</label>
              <input
                type="number"
                value={pfep.max_stock}
                onChange={e => setPfep({ ...pfep, max_stock: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Lead Time (days)</label>
              <input
                type="number"
                value={pfep.lead_time_days}
                onChange={e => setPfep({ ...pfep, lead_time_days: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Gross Weight (kg)</label>
              <input
                type="number"
                value={pfep.gross_weight_kg}
                onChange={e => setPfep({ ...pfep, gross_weight_kg: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Net Weight (kg)</label>
              <input
                type="number"
                value={pfep.net_weight_kg}
                onChange={e => setPfep({ ...pfep, net_weight_kg: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Yield %</label>
              <input
                type="number"
                value={pfep.yield_percent}
                onChange={e => setPfep({ ...pfep, yield_percent: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">ABC Classification</label>
              <select
                value={pfep.abc_classification}
                onChange={e => setPfep({ ...pfep, abc_classification: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="A">A — High value</option>
                <option value="B">B — Medium value</option>
                <option value="C">C — Low value</option>
              </select>
            </div>
          </div>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to update PFEP</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PFEP: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.get('/api/items').then(r => r.data.data)
  });

  const { data: stockData } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/api/stock').then(r => r.data.data)
  });

  const filtered = items?.filter((item: any) => {
    const matchSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.item_code.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || item.item_type === filter;
    return matchSearch && matchFilter;
  });

  const getStock = (item_id: string) =>
    stockData?.find((s: any) => s.item_id === item_id);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-primary font-medium animate-pulse">Loading PFEP data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} />}
      {selectedItem && <EditPFEPModal item={selectedItem} onClose={() => setSelectedItem(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">PFEP Master</h1>
          <p className="text-text-secondary text-sm mt-1">Plan For Every Part — single source of truth</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
        >
          + Add Item
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by part name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <option value="all">All Types</option>
          <option value="raw_material">Raw Material</option>
          <option value="finished_goods">Finished Goods</option>
          <option value="consumable">Consumable</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-light">
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Item</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Type</th>
              <th className="text-left px-4 py-3 text-brand-primary font-medium">Storage</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">On Hand</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Reorder Point</th>
              <th className="text-right px-4 py-3 text-brand-primary font-medium">Yield %</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Zone</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">ABC</th>
              <th className="text-center px-4 py-3 text-brand-primary font-medium">Edit</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((item: any, i: number) => {
              const stock = getStock(item.id);
              return (
                <tr key={item.id} className={`border-t border-border hover:bg-surface ${i % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{item.item_name}</p>
                    <p className="text-text-secondary text-xs">{item.item_code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-brand-light text-brand-primary px-2 py-0.5 rounded-full">
                      {item.item_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {item.pfep_detail?.storage_location || '—'}
                    {item.pfep_detail?.rack_address && ` · ${item.pfep_detail.rack_address}`}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text-primary">
                    {stock ? `${stock.quantity_on_hand?.toLocaleString()} ${item.unit_of_measure}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">
                    {item.pfep_detail?.reorder_point?.toLocaleString() || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary text-xs">
                    {item.pfep_detail?.yield_percent ? `${item.pfep_detail.yield_percent}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stock?.zone ? <ZoneBadge zone={stock.zone} /> : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-text-primary">
                      {item.pfep_detail?.abc_classification || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-xs bg-brand-light text-brand-primary px-2 py-1 rounded hover:bg-blue-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered?.length === 0 && (
          <div className="text-center py-12 text-text-secondary">No items found</div>
        )}
      </div>
    </div>
  );
};

export default PFEP;
