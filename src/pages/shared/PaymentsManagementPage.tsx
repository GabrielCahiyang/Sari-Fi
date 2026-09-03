import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Badge } from '../../components/ui/Badge';
import { updateRecord } from '../../services/firebase/rtdbService';

export function PaymentsManagementPage() {
  const { state, dispatch, getCustomer, showToast, formatPHP, logAudit } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'cash' | 'gcash'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const payments = state.payments.filter(p => {
    const customer = getCustomer(p.customerId);
    const matchesSearch = search === '' || p.paymentNo.toLowerCase().includes(search.toLowerCase()) || customer?.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesMethod = filter === 'all' || p.method === filter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesMethod && matchesStatus;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleConfirmCash = async (paymentId: string, orderId?: string) => {
    const p = state.payments.find(x => x.id === paymentId);
    // Defensive guard / Idempotency: cannot confirm an already paid payment
    if (!p || p.status === 'paid') return;

    const confirmedBy = state.currentUser?.name || 'Staff';
    const paidAt = new Date().toISOString();
    try {
      await updateRecord('payments', paymentId, { status: 'paid', confirmedBy, paidAt });
      if (orderId) {
        await updateRecord('orders', orderId, {
          paymentStatus: 'paid',
          status: 'completed',
          confirmedBy,
          updatedAt: paidAt
        });
      }
      // Single authoritative audit created by reducer deriveAudit
      dispatch({ type: 'CONFIRM_CASH_PAYMENT', paymentId, confirmedBy });
      showToast('success', 'Cash payment confirmed.');
    } catch (err: any) {
      showToast('error', 'Failed to confirm cash: ' + err.message);
    }
  };

  const totalPaid = state.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = state.payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const cashTotal = state.payments.filter(p => p.method === 'cash' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const gcashTotal = state.payments.filter(p => p.method === 'gcash' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <InternalLayout title="Payments">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1E7D3B] rounded-2xl p-4">
            <div className="text-white/70 text-xs font-600 uppercase tracking-wider">Total Collected</div>
            <div className="text-white font-800 text-2xl mt-1">{formatPHP(totalPaid)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Cash Collected</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{formatPHP(cashTotal)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">GCash Collected</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{formatPHP(gcashTotal)}</div>
          </div>
          <div className="bg-[#FFF8E1] rounded-2xl border border-[#FFC107]/30 p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Pending Confirmation</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{formatPHP(totalPending)}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by payment no or customer…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]" />
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value as any)} className="px-3.5 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none flex-1 sm:flex-initial">
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3.5 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none flex-1 sm:flex-initial">
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[#F7F8F6]">
            {payments.map(pay => {
              const customer = getCustomer(pay.customerId);
              return (
                <div key={pay.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-700 text-sm text-[#10212B]">{pay.paymentNo}</div>
                      <div className="text-xs text-[#65727A]">
                        {new Date(pay.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <Badge variant={pay.status === 'paid' ? 'green' : 'yellow'} size="sm">
                      {pay.status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>

                  <div className="bg-[#F7F8F6] p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Customer:</span>
                      <span className="font-600 text-[#10212B] truncate max-w-[180px]">{customer?.fullName || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Type:</span>
                      <span className="capitalize text-[#10212B]">{pay.type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#65727A]">Method:</span>
                      <span className={`text-[10px] font-700 px-2 py-0.5 rounded-md border ${pay.method === 'gcash' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-[#65727A] border-[#E4E8E6]'}`}>
                        {pay.method.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Confirmed By:</span>
                      <span className="text-[#10212B]">{pay.confirmedBy || (pay.method === 'gcash' ? 'Auto (GCash)' : '—')}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E4E8E6]">
                      <span className="font-700 text-[#10212B]">Amount:</span>
                      <span className="font-800 text-sm text-[#0D2B45]">{formatPHP(pay.amount)}</span>
                    </div>
                  </div>

                  {pay.status === 'pending' && pay.method === 'cash' && (
                    <button
                      onClick={() => handleConfirmCash(pay.id, pay.orderId)}
                      className="w-full py-2 bg-[#1E7D3B] text-white text-xs font-600 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20"
                    >
                      Confirm Cash
                    </button>
                  )}
                </div>
              );
            })}
            {payments.length === 0 && (
              <div className="text-center py-12 text-[#65727A] text-sm">No payments found</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Payment</th>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Method</th>
                  <th className="text-left px-5 py-3">Amount</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Confirmed By</th>
                  <th className="text-left px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {payments.map(pay => {
                  const customer = getCustomer(pay.customerId);
                  return (
                    <tr key={pay.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-700 text-sm text-[#10212B]">{pay.paymentNo}</div>
                        <div className="text-[11px] text-[#65727A]">{new Date(pay.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#10212B]">{customer?.fullName}</td>
                      <td className="px-5 py-3 text-xs text-[#65727A] capitalize">{pay.type.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-600 px-2.5 py-1 rounded-full border ${pay.method === 'gcash' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-[#F7F8F6] text-[#65727A] border-[#E4E8E6]'}`}>
                          {pay.method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(pay.amount)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={pay.status === 'paid' ? 'green' : 'yellow'}>{pay.status === 'paid' ? 'Paid' : 'Pending'}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#65727A]">{pay.confirmedBy || (pay.method === 'gcash' ? 'Auto (GCash)' : '—')}</td>
                      <td className="px-5 py-3">
                        {pay.status === 'pending' && pay.method === 'cash' && (
                          <button
                            onClick={() => handleConfirmCash(pay.id, pay.orderId)}
                            className="px-3 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-lg hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20"
                          >
                            Confirm Cash
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {payments.length === 0 && (
              <div className="text-center py-12 text-[#65727A] text-sm">No payments found</div>
            )}
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
