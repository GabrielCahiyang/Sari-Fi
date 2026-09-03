import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { FinancingStatusBadge } from '../../components/ui/Badge';
import { approveFinancingFlow, cancelOrderFlow } from '../../services/firebase/rtdbService';

export function FinancingManagementPage() {
  const { state, dispatch, getCustomer, showToast, formatPHP, logAudit } = useApp();
  const [filter, setFilter] = useState('all');
  const role = state.currentUser?.role || 'employee';

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const financing = state.financing.filter(f => filter === 'all' || f.status === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const approveFinancing = async (finId: string) => {
    const fin = state.financing.find(f => f.id === finId);
    // Defensive guard / Idempotency: only pending financing can be approved
    if (!fin || fin.status !== 'pending') return;
    const approvedBy = state.currentUser?.name || 'Admin';
    try {
      await approveFinancingFlow(finId, approvedBy);
      dispatch({ type: 'APPROVE_FINANCING', financingId: finId, approvedBy });
      showToast('success', `Financing ${fin.financingNo} is active. The order will process once every payment part is cleared.`);
    } catch (err: any) {
      showToast('error', 'Failed to approve financing: ' + err.message);
    }
  };

  const rejectFinancing = async (finId: string) => {
    const fin = state.financing.find(f => f.id === finId);
    // Defensive guard / Idempotency: only pending financing can be rejected
    if (!fin || fin.status !== 'pending') return;
    const rejectedBy = state.currentUser?.name || 'Admin';

    try {
      const relatedOrder = state.orders.find(o => o.financingId === finId || o.id === fin.orderId);
      if (!relatedOrder) throw new Error('Related order not found.');
      await cancelOrderFlow(relatedOrder.id, 'Financing rejected', rejectedBy);

      dispatch({ type: 'REJECT_FINANCING', financingId: finId, rejectedBy });
      showToast('info', 'Financing rejected, order cancelled, and reserved stock released.');
    } catch (err: any) {
      showToast('error', 'Failed to reject financing: ' + err.message);
    }
  };

  const pendingCount = state.financing.filter(f => f.status === 'pending').length;
  const activeCount = state.financing.filter(f => f.status === 'active').length;
  const overdueCount = state.financing.filter(f => f.status === 'overdue').length;
  const totalActive = state.financing.filter(f => f.status === 'active' || f.status === 'overdue').reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);

  return (
    <InternalLayout title="Financing">
      <div className="space-y-5">
        {/* Bento summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`rounded-2xl p-4 border shadow-xs flex flex-col justify-between ${
            pendingCount > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-[#E4E8E6]'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Pending Review</span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                pendingCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-[#65727A]'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div>
              <div className={`font-800 text-2xl mt-1 ${pendingCount > 0 ? 'text-amber-700' : 'text-[#10212B]'}`}>
                {pendingCount}
              </div>
              <div className="text-[#65727A] text-[11px] mt-0.5">
                {pendingCount > 0 ? 'Requires supervisor decision' : 'No pending loans'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Active Loans</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1E7D3B] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div>
              <div className="text-[#1E7D3B] font-800 text-2xl mt-1">{activeCount}</div>
              <div className="text-[#65727A] text-[11px] mt-0.5">Currently in repayment</div>
            </div>
          </div>

          <div className={`rounded-2xl p-4 border shadow-xs flex flex-col justify-between ${
            overdueCount > 0 ? 'bg-red-50/40 border-red-200' : 'bg-white border-[#E4E8E6]'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Overdue</span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-[#65727A]'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div>
              <div className={`font-800 text-2xl mt-1 ${overdueCount > 0 ? 'text-red-600' : 'text-[#10212B]'}`}>
                {overdueCount}
              </div>
              <div className="text-[#65727A] text-[11px] mt-0.5">
                {overdueCount > 0 ? 'Accounts past due date' : 'Zero overdue accounts'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Total Outstanding</span>
              <span className="w-8 h-8 rounded-xl bg-slate-100 text-[#0D2B45] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
            </div>
            <div>
              <div className="text-[#0D2B45] font-800 text-2xl mt-1">{formatPHP(Math.round(totalActive))}</div>
              <div className="text-[#65727A] text-[11px] mt-0.5">Principal + finance charges</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`shrink-0 px-4 py-2 rounded-full text-sm font-600 border transition-all ${filter === f.value ? 'bg-[#0D2B45] text-white border-[#0D2B45]' : 'bg-white text-[#65727A] border-[#E4E8E6] hover:border-[#0D2B45]/30'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Table & Cards */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[#F7F8F6]">
            {financing.map(fin => {
              const customer = getCustomer(fin.customerId);
              const paidInstallments = fin.schedule ? fin.schedule.filter(s => s.status === 'paid').length : 0;
              return (
                <div
                  key={fin.id}
                  data-tour-target={fin.id === 'fin_tour_001' ? '2' : undefined}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-700 text-sm text-[#10212B]">{fin.financingNo}</div>
                      <div className="text-xs text-[#65727A]">
                        {new Date(fin.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <FinancingStatusBadge status={fin.status} />
                  </div>

                  <div className="bg-[#F7F8F6] p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Customer:</span>
                      <span className="font-600 text-[#10212B] truncate max-w-[180px]">{customer?.fullName || '—'}</span>
                    </div>
                    {customer?.storeName && (
                      <div className="flex justify-between">
                        <span className="text-[#65727A]">Store:</span>
                        <span className="text-[#10212B] truncate max-w-[180px]">{customer.storeName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Principal:</span>
                      <span className="font-600 text-[#10212B]">{formatPHP(fin.principal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Charge:</span>
                      <span className="text-[#10212B]">{fin.chargePercent}% ({formatPHP(fin.chargeAmount)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Plan:</span>
                      <span className="font-600 text-[#10212B]">{fin.plan}mo · {paidInstallments}/{fin.installmentCount} paid</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65727A]">Weekly Due:</span>
                      <span className="font-700 text-[#1E7D3B]">{formatPHP(fin.weeklyInstallment)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E4E8E6]">
                      <span className="font-700 text-[#10212B]">Total Repayable:</span>
                      <span className="font-800 text-sm text-[#0D2B45]">{formatPHP(fin.totalRepayable)}</span>
                    </div>
                  </div>

                  {(role === 'supervisor' || role === 'admin') && fin.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => rejectFinancing(fin.id)}
                        className="flex-1 py-2 border border-red-200 text-red-600 text-xs font-600 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => approveFinancing(fin.id)}
                        className="flex-1 py-2 bg-[#1E7D3B] text-white text-xs font-600 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {financing.length === 0 && (
              <div className="text-center py-12 text-[#65727A] text-sm">No financing records found</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6] bg-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Financing</th>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-5 py-3">Principal</th>
                  <th className="text-left px-5 py-3">Charge</th>
                  <th className="text-left px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Weekly</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Status</th>
                  {(role === 'supervisor' || role === 'admin') && <th className="text-left px-5 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {financing.map(fin => {
                  const customer = getCustomer(fin.customerId);
                  const paidInstallments = fin.schedule ? fin.schedule.filter(s => s.status === 'paid').length : 0;
                  return (
                    <tr
                      key={fin.id}
                      data-tour-target={fin.id === 'fin_tour_001' ? '2' : undefined}
                      className="hover:bg-[#F7F8F6]/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="font-700 text-sm text-[#10212B]">{fin.financingNo}</div>
                        <div className="text-[11px] text-[#65727A]">{new Date(fin.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-[#10212B]">{customer?.fullName}</div>
                        <div className="text-[11px] text-[#65727A]">{customer?.storeName}</div>
                      </td>
                      <td className="px-5 py-3 font-600 text-sm text-[#10212B]">{formatPHP(fin.principal)}</td>
                      <td className="px-5 py-3 text-sm text-[#65727A]">{fin.chargePercent}% · {formatPHP(fin.chargeAmount)}</td>
                      <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(fin.totalRepayable)}</td>
                      <td className="px-5 py-3 font-600 text-sm text-[#1E7D3B]">{formatPHP(fin.weeklyInstallment)}</td>
                      <td className="px-5 py-3 text-xs text-[#65727A]">{fin.plan}mo · {paidInstallments}/{fin.installmentCount}×</td>
                      <td className="px-5 py-3"><FinancingStatusBadge status={fin.status} /></td>
                      {(role === 'supervisor' || role === 'admin') && (
                        <td className="px-5 py-3">
                          {fin.status === 'pending' && (
                            <div className="flex gap-1.5">
                              <button onClick={() => rejectFinancing(fin.id)} className="px-2.5 py-1.5 border border-red-200 text-red-600 text-xs font-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer">Reject</button>
                              <button onClick={() => approveFinancing(fin.id)} className="px-2.5 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-lg hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20">Approve</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {financing.length === 0 && (
              <div className="text-center py-12 text-[#65727A] text-sm">No financing records</div>
            )}
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
