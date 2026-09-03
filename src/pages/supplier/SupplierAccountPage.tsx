import { useState, useMemo } from 'react';
import { SupplierLayout } from '../../components/layout/SupplierLayout';
import { useApp } from '../../context/AppContext';
import { updateRecord } from '../../services/firebase/rtdbService';
import type { Supplier } from '../../types';

export function SupplierAccountPage() {
  const { state, dispatch, showToast } = useApp();

  const supplier = useMemo(() => {
    return state.suppliers.find(s => s.id === state.currentUser?.supplierId) || {
      id: state.currentUser?.supplierId || 'sup1',
      name: state.currentUser?.name || 'Wholesale Supplier',
      contact: 'Warehouse Representative',
      phone: '028881234',
      email: state.currentUser?.email || 'supplier@sarifi.ph',
      address: 'Metro Manila Distribution Center',
      categories: ['Beverages', 'Snacks'],
      status: 'active' as const,
      loginEmail: state.currentUser?.email || 'supplier@sarifi.ph',
      bankName: 'BDO Unibank',
      bankAccountNo: '001234567890',
      gcashNumber: '09171234567',
    };
  }, [state.suppliers, state.currentUser]);

  const [formData, setFormData] = useState({
    name: supplier.name,
    contact: supplier.contact,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    bankName: supplier.bankName || 'BDO Unibank',
    bankAccountNo: supplier.bankAccountNo || '001234567890',
    gcashNumber: supplier.gcashNumber || '09171234567',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated: Supplier = {
        ...supplier,
        ...formData,
      };

      await updateRecord('suppliers', supplier.id, updated);
      dispatch({ type: 'UPDATE_SUPPLIER', supplier: updated });
      showToast('success', 'Supplier profile and payout details saved.');
    } catch (err: any) {
      showToast('error', 'Failed to update account: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SupplierLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
          <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] tracking-tight">
            Supplier Account & Payouts
          </h1>
          <p className="text-xs sm:text-sm text-[#65727A] mt-1">
            Manage your company profile, distribution warehouse location, and automated platform payout settings.
          </p>
        </div>

        {/* Partnership Overview Card */}
        <div className="bg-[#0D2B45] text-white p-5 rounded-2xl shadow-sm border border-[#1A3B5C] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="text-[10px] font-700 uppercase tracking-widest text-[#FFC107]">
                Sari-Fi Middleman Network
              </div>
              <h2 className="text-lg font-800 text-white mt-0.5">
                Guaranteed Wholesale Payout Model
              </h2>
              <p className="text-xs text-white/75 mt-1 max-w-xl leading-relaxed">
                As our wholesale partner, Sari-Fi guarantees 100% of your payout value for verified orders. Sari-Fi underwrites the micro-financing and credit risk with sari-sari stores, while you enjoy reliable, upfront wholesale revenue.
              </p>
            </div>

            <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 text-center shrink-0">
              <div className="text-[10px] text-white/70">Partner Tier</div>
              <div className="text-sm font-900 text-[#FFC107] uppercase mt-0.5">Tier 1 Wholesaler</div>
              <div className="text-[10px] text-white/60 mt-1">0% supplier fee</div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Information */}
          <div className="bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs space-y-4">
            <h3 className="font-800 text-sm text-[#0D2B45] border-b border-[#E4E8E6] pb-3">
              Company & Warehouse Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-700 text-[#0D2B45] mb-1">Company / Distributor Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-700 text-[#0D2B45] mb-1">Primary Contact Person</label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-700 text-[#0D2B45] mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-700 text-[#0D2B45] mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-700 text-[#0D2B45] mb-1">Warehouse / Dispatch Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
              />
            </div>
          </div>

          {/* Payout Channels */}
          <div className="bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs space-y-4">
            <h3 className="font-800 text-sm text-[#0D2B45] border-b border-[#E4E8E6] pb-3">
              Wholesale Payout Accounts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-700 text-[#0D2B45] mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. BDO Unibank / BPI"
                  className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-700 text-[#0D2B45] mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={e => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  placeholder="001234567890"
                  className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-700 text-[#0D2B45] mb-1">GCash Business Number</label>
                <input
                  type="text"
                  value={formData.gcashNumber}
                  onChange={e => setFormData({ ...formData, gcashNumber: e.target.value })}
                  placeholder="0917XXXXXXX"
                  className="w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Account Settings'}
            </button>
          </div>
        </form>
      </div>
    </SupplierLayout>
  );
}
