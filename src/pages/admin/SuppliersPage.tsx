import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { Supplier } from '../../types';

export function SuppliersPage() {
  const { state, dispatch, showToast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const suppliers = state.suppliers.filter(s =>
    search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const newSupplier: Supplier = {
      id: `sup${Date.now()}`,
      name: data.name as string,
      contact: data.contact as string,
      phone: data.phone as string,
      email: data.email as string,
      address: data.address as string,
      categories: (data.categories as string).split(',').map(c => c.trim()),
      status: 'active',
    };
    dispatch({ type: 'ADD_SUPPLIER', supplier: newSupplier });
    showToast('success', 'Supplier added.');
    setShowAdd(false);
  };

  return (
    <InternalLayout title="Suppliers">
      <div className="space-y-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]" />
          </div>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all">+ Add Supplier</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-700 text-sm text-[#10212B]">{s.name}</div>
                  <div className="text-xs text-[#65727A] mt-0.5">{s.contact}</div>
                </div>
                <Badge variant={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
              </div>
              <div className="space-y-1.5 text-xs text-[#65727A]">
                <div className="flex gap-2"><span className="font-600 text-[#10212B]">Phone:</span> {s.phone}</div>
                <div className="flex gap-2"><span className="font-600 text-[#10212B]">Email:</span> {s.email}</div>
                <div className="flex gap-2"><span className="font-600 text-[#10212B]">Address:</span> {s.address}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.categories.map(cat => (
                  <span key={cat} className="text-[10px] font-600 bg-[#F7F8F6] text-[#65727A] border border-[#E4E8E6] px-2 py-0.5 rounded-full">{cat}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'name', label: 'Supplier Name', required: true },
              { name: 'contact', label: 'Contact Person' },
              { name: 'phone', label: 'Phone' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'address', label: 'Address' },
              { name: 'categories', label: 'Categories (comma-separated)' },
            ].map(f => (
              <div key={f.name}>
                <label className="text-xs font-600 text-[#65727A]">{f.label}</label>
                <input name={f.name} type={f.type || 'text'} required={f.required} className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
              </div>
            ))}
          </div>
          <button type="submit" className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all">Add Supplier</button>
        </form>
      </Modal>
    </InternalLayout>
  );
}
