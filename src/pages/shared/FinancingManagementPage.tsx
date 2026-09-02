import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { FinancingStatusBadge } from '../../components/ui/Badge';
import { saveRecord, updateRecord } from '../../services/firebase/rtdbService';
import type { InstallmentSchedule, OrderStatus } from '../../types';

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
    const approvedAt = new Date().toISOString();

    const today = new Date();
    const schedule: InstallmentSchedule[] = fin.schedule.map((s, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1) * 7);
      return { ...s, dueDate: d.toISOString().split('T')[0], status: i === 0 ? 'due' : 'upcoming' };
    });

    const updatedFinancing = {
      ...fin,
      status: 'active' as const,
      approvedBy,
      approvedAt,
      schedule,
    };

    try {
      await saveRecord('financing', updatedFinancing);

      // Update order status to completed and paymentStatus to paid
      const relatedOrder = state.orders.find(o => o.financingId === finId || o.id === fin.orderId);
      if (relatedOrder) {
        await updateRecord('orders', relatedOrder.id, {
          status: 'completed' as OrderStatus,
          paymentStatus: 'paid' as const,
          updatedAt: approvedAt,
        });
      }

      // INVARIANT: Consume customer credit limit exactly once on approval
      const customer = state.customers.find(c => c.id === fin.customerId);
      if (customer) {
        await updateRecord('customers', customer.id, {
          usedCredit: customer.usedCredit + fin.principal,
        });
      }

      // Reducer deriveAudit will automatically create the single authoritative audit event
      dispatch({ type: 'APPROVE_FINANCING', financingId: finId, approvedBy });
      showToast('success', `Financing ${fin.financingNo} approved!`);
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
      await updateRecord('financing', finId, { status: 'rejected', rejectedBy });
      const relatedOrder = state.orders.find(o => o.financingId === finId || o.id === fin.orderId);
      if (relatedOrder) {
        await updateRecord('orders', relatedOrder.id, {
          status: 'cancelled' as OrderStatus,
          updatedAt: new Date().toISOString(),
        });

        // INVARIANT: Restore reserved inventory upon rejection
        const orderItems = Array.isArray(relatedOrder.items) ? relatedOrder.items : [];
        for (const item of orderItems) {
          const prod = state.products.find(p => p.id === item.productId);
          if (prod) {
            await updateRecord('products', prod.id, { stock: prod.stock + item.quantity });
          }
        }
      }

      // Reducer deriveAudit will automatically create the single authoritative audit event
      dispatch({ type: 'REJECT_FINANCING', financingId: finId, rejectedBy });
      showToast('info', 'Financing request rejected.');
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
          <div className={`rounded-2xl p-4 border ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Pending</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{pendingCount}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Active</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{activeCount}</div>
          </div>
          <div className={`rounded-2xl p-4 border ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Overdue</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{overdueCount}</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Total Outstanding</div>
            <div className="text-[#10212B] font-800 text-xl mt-1">{formatPHP(Math.round(totalActive))}</div>
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

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="overflow-x-auto">
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
                    <tr key={fin.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
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
