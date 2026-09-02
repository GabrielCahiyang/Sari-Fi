import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AuditTrail } from '../../components/AuditTrail';
import type { Customer } from '../../types';

export function CustomersManagementPage() {
  const { state, dispatch, getCustomerOrders, getCustomerFinancing, showToast, formatPHP } = useApp();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [newLimit, setNewLimit] = useState('');

  const role = state.currentUser?.role || 'employee';
  const canCreate = role === 'supervisor' || role === 'admin';

  const scopedActivity = (cust: Customer) => {
    const orderIds = new Set(getCustomerOrders(cust.id).map(o => o.id));
    const finIds = new Set(getCustomerFinancing(cust.id).map(f => f.id));
    const payIds = new Set(state.payments.filter(p => p.customerId === cust.id).map(p => p.id));
    return state.auditLog.filter(e =>
      e.targetId === cust.id ||
      e.actorName === cust.fullName ||
      (e.targetId != null && (orderIds.has(e.targetId) || finIds.has(e.targetId) || payIds.has(e.targetId)))
    );
  };

  const customers = state.customers.filter(c =>
    search === '' || c.fullName.toLowerCase().includes(search.toLowerCase()) || c.storeName.toLowerCase().includes(search.toLowerCase()) || c.accountNo.includes(search)
  );

  const createCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const newCustomer: Customer = {
      id: `cust${Date.now()}`,
      accountNo: `SF-${String(state.customers.length + 1).padStart(4, '0')}`,
      fullName: data.fullName as string,
      phone: data.phone as string,
      email: data.email as string,
      address: data.address as string,
      storeName: data.storeName as string,
      storeAddress: data.storeAddress as string,
      yearsOperating: parseInt(data.yearsOperating as string) || 0,
      notes: data.notes as string,
      loginEmail: data.loginEmail as string,
      status: 'active',
      creditLimit: parseInt(data.creditLimit as string) || state.settings.startingCreditLimit,
      usedCredit: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    dispatch({ type: 'ADD_CUSTOMER', customer: newCustomer });
    showToast('success', `Customer account for ${newCustomer.fullName} created.`);
    setShowCreate(false);
  };

  const adjustLimit = () => {
    if (!selectedCustomer || !newLimit) return;
    const updated = { ...selectedCustomer, creditLimit: parseInt(newLimit) };
    dispatch({ type: 'UPDATE_CUSTOMER', customer: updated });
    showToast('success', 'Credit limit updated.');
    setSelectedCustomer(null);
    setNewLimit('');
  };

  return (
    <InternalLayout title="Customers">
      <div className="space-y-5">
        {/* Bento summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Total Customers</div>
            <div className="text-[#0D2B45] font-800 text-2xl mt-1">{state.customers.length}</div>
          </div>
          <div className="bg-[#1E7D3B] rounded-2xl p-4">
            <div className="text-white/70 text-xs font-600 uppercase tracking-wider">Active</div>
            <div className="text-white font-800 text-2xl mt-1">{state.customers.filter(c => c.status === 'active').length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Suspended</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{state.customers.filter(c => c.status === 'suspended').length}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]" />
          </div>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all">+ Create Customer</button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-5 py-3">Account No.</th>
                  <th className="text-left px-5 py-3">Credit Limit</th>
                  <th className="text-left px-5 py-3">Available</th>
                  <th className="text-left px-5 py-3">Outstanding</th>
                  <th className="text-left px-5 py-3">Standing</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {customers.map(cust => {
                  const available = cust.creditLimit - cust.usedCredit;
                  const custFinancing = getCustomerFinancing(cust.id);
                  const outstanding = custFinancing.filter(f => f.status === 'active' || f.status === 'overdue').reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
                  const hasOverdue = custFinancing.some(f => f.status === 'overdue');
                  return (
                    <tr key={cust.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-600 text-sm text-[#10212B]">{cust.fullName}</div>
                        <div className="text-[11px] text-[#65727A]">{cust.storeName}</div>
                      </td>
                      <td className="px-5 py-3 text-sm font-600 text-[#65727A]">{cust.accountNo}</td>
                      <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(cust.creditLimit)}</td>
                      <td className="px-5 py-3 font-700 text-sm text-[#1E7D3B]">{formatPHP(available)}</td>
                      <td className="px-5 py-3 font-600 text-sm text-[#10212B]">{formatPHP(Math.round(outstanding))}</td>
                      <td className="px-5 py-3">
                        {hasOverdue
                          ? <Badge variant="red">Overdue</Badge>
                          : cust.status === 'suspended'
                          ? <Badge variant="red">Suspended</Badge>
                          : <Badge variant="green">Good</Badge>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setHistoryCustomer(cust)}
                            className="text-xs text-[#65727A] font-600 hover:text-[#0D2B45] hover:underline"
                          >
                            History
                          </button>
                          {canCreate && (
                            <button
                              onClick={() => { setSelectedCustomer(cust); setNewLimit(String(cust.creditLimit)); }}
                              className="text-xs text-[#1E7D3B] font-600 hover:underline"
                            >
                              Adjust Limit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Customer Account" size="lg">
        <form onSubmit={createCustomer} className="space-y-4">
          <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mb-3">Personal Information</div>
          <div className="grid grid-cols-2 gap-4">
            {[['fullName', 'Full Name'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address']].map(([name, label]) => (
              <div key={name}>
                <label className="text-xs font-600 text-[#65727A]">{label}</label>
                <input name={name} required className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
              </div>
            ))}
          </div>
          <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mt-4 mb-3">Store Information</div>
          <div className="grid grid-cols-2 gap-4">
            {[['storeName', 'Store Name'], ['storeAddress', 'Store Address'], ['yearsOperating', 'Years Operating'], ['notes', 'Notes']].map(([name, label]) => (
              <div key={name}>
                <label className="text-xs font-600 text-[#65727A]">{label}</label>
                <input name={name} type={name === 'yearsOperating' ? 'number' : 'text'} className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
              </div>
            ))}
          </div>
          <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mt-4 mb-3">Account & Financing</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-600 text-[#65727A]">Login Email</label>
              <input name="loginEmail" type="email" required className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
            </div>
            <div>
              <label className="text-xs font-600 text-[#65727A]">Temp Password</label>
              <input name="tempPassword" type="text" defaultValue="temp1234" required className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
            </div>
            <div>
              <label className="text-xs font-600 text-[#65727A]">Initial Credit Limit</label>
              <input name="creditLimit" type="number" defaultValue={state.settings.startingCreditLimit} className="mt-1 w-full px-3 py-2 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all mt-2">Create Customer Account</button>
        </form>
      </Modal>

      {/* Customer History Modal */}
      <Modal open={historyCustomer !== null} onClose={() => setHistoryCustomer(null)} title={historyCustomer ? `Activity — ${historyCustomer.fullName}` : 'Activity'} size="lg">
        {historyCustomer && (
          <div className="max-h-[65vh] overflow-y-auto -mx-1 px-1">
            <div className="flex items-center gap-3 bg-[#F7F8F6] rounded-xl p-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[#1a3d5c] to-[#0D2B45] rounded-xl flex items-center justify-center text-white font-700 text-sm">{historyCustomer.fullName.charAt(0)}</div>
              <div>
                <div className="font-700 text-sm text-[#10212B]">{historyCustomer.fullName}</div>
                <div className="text-xs text-[#65727A]">{historyCustomer.accountNo} · {historyCustomer.storeName}</div>
              </div>
            </div>
            <AuditTrail entries={scopedActivity(historyCustomer)} showFilters={false} pageSize={20} emptyLabel="No recorded activity for this customer yet." />
          </div>
        )}
      </Modal>

      {/* Adjust Limit Modal */}
      <Modal open={selectedCustomer !== null} onClose={() => setSelectedCustomer(null)} title="Adjust Credit Limit" size="sm">
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="bg-[#F7F8F6] rounded-xl p-4">
              <div className="font-700 text-sm text-[#10212B]">{selectedCustomer.fullName}</div>
              <div className="text-xs text-[#65727A]">Current limit: {formatPHP(selectedCustomer.creditLimit)}</div>
            </div>
            <div>
              <label className="text-xs font-600 text-[#65727A]">New Credit Limit (₱)</label>
              <input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
            </div>
            <button onClick={adjustLimit} className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all">Update Limit</button>
          </div>
        )}
      </Modal>
    </InternalLayout>
  );
}
