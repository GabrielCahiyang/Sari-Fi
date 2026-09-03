import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { Supplier } from '../../types';
import { saveRecord, deleteRecord } from '../../services/firebase/rtdbService';

export function SuppliersPage() {
  const { state, dispatch, showToast, logAudit } = useApp();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const suppliers = state.suppliers.filter(s =>
    search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    const newSupplier: Supplier = {
      id: `sup${Date.now()}`,
      name: data.name as string,
      contact: data.contact as string,
      phone: data.phone as string,
      email: data.email as string,
      address: data.address as string,
      categories: (data.categories as string ? (data.categories as string).split(',').map(c => c.trim()) : []),
      status: 'active',
    };

    try {
      await saveRecord('suppliers', newSupplier);
      dispatch({ type: 'ADD_SUPPLIER', supplier: newSupplier });
      await logAudit({
        category: 'supplier',
        action: 'supplier.create',
        summary: `Added supplier "${newSupplier.name}"`,
        targetType: 'supplier',
        targetId: newSupplier.id,
        targetLabel: newSupplier.name,
      });
      showToast('success', 'Supplier saved.');
      setShowAdd(false);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to save supplier: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    const nextStatus: 'active' | 'inactive' = supplier.status === 'active' ? 'inactive' : 'active';
    const updated: Supplier = { ...supplier, status: nextStatus };
    try {
      await saveRecord('suppliers', updated);
      dispatch({ type: 'UPDATE_SUPPLIER', supplier: updated });
      await logAudit({
        category: 'supplier',
        action: 'supplier.update',
        summary: `Supplier "${supplier.name}" marked ${nextStatus}`,
        targetType: 'supplier',
        targetId: supplier.id,
        targetLabel: supplier.name,
      });
      showToast('info', `Supplier marked ${nextStatus}.`);
    } catch (err: any) {
      showToast('error', 'Failed to update: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    try {
      await deleteRecord('suppliers', id);
      dispatch({ type: 'DELETE_SUPPLIER', supplierId: id });
      await logAudit({
        category: 'supplier',
        action: 'supplier.delete',
        summary: `Deleted supplier "${name}"`,
        targetType: 'supplier',
        targetId: id,
        targetLabel: name,
      });
      showToast('info', 'Supplier deleted.');
    } catch (err: any) {
      showToast('error', 'Failed to delete: ' + err.message);
    }
  };

  return (
    <InternalLayout title="Suppliers">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]" />
          </div>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20 shrink-0 self-start sm:self-auto">+ Add Supplier</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-[#E4E8E6] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-700 text-sm text-[#10212B]">{s.name}</div>
                    <div className="text-xs text-[#65727A] mt-0.5">{s.contact}</div>
                  </div>
                  <button onClick={() => handleToggleStatus(s)} className="cursor-pointer">
                    <Badge variant={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-[#65727A]">
                  <div className="flex gap-2"><span className="font-600 text-[#10212B]">Phone:</span> {s.phone || '—'}</div>
                  <div className="flex gap-2"><span className="font-600 text-[#10212B]">Email:</span> {s.email || '—'}</div>
                  <div className="flex gap-2"><span className="font-600 text-[#10212B]">Address:</span> {s.address || '—'}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.categories && s.categories.map(cat => (
                    <span key={cat} className="text-[10px] font-600 bg-[#F7F8F6] text-[#65727A] border border-[#E4E8E6] px-2 py-0.5 rounded-full">{cat}</span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F7F8F6] flex justify-end">
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Delete Supplier
                </button>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-[#E4E8E6] p-12 text-center">
              <div className="text-[#65727A] text-sm font-600">No suppliers registered yet</div>
              <p className="text-xs text-[#65727A]/70 mt-1">Click "+ Add Supplier" to register your first supplier partner.</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Supplier'}
          </button>
        </form>
      </Modal>
    </InternalLayout>
  );
}
