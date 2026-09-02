import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { OrderStatusBadge } from '../../components/ui/Badge';
import type { Order, OrderStatus } from '../../types';
import { saveRecord, updateRecord } from '../../services/firebase/rtdbService';

export function OrdersManagementPage() {
  const { state, dispatch, getCustomer, showToast, logAudit, formatPHP, navigate } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending_financing', label: 'Pending Financing' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const orders = state.orders.filter(o => {
    const customer = getCustomer(o.customerId);
    const matchesSearch = search === '' || o.orderNo.toLowerCase().includes(search.toLowerCase()) || customer?.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const confirmedBy = state.currentUser?.name || 'Staff';
    const updatedAt = new Date().toISOString();
    try {
      const o = state.orders.find(x => x.id === orderId);
      if (o) {
        await saveRecord('orders', { ...o, status, confirmedBy, updatedAt });
      } else {
        await updateRecord('orders', orderId, { status, confirmedBy, updatedAt });
      }
      // Single authoritative audit created by reducer deriveAudit
      dispatch({ type: 'UPDATE_ORDER_STATUS', orderId, status, confirmedBy });
      showToast('success', `Order status updated to ${status.replace(/_/g, ' ')}.`);
    } catch (err: any) {
      showToast('error', 'Failed to update order: ' + err.message);
    }
  };

  const handleConfirmCash = async (paymentId: string, orderId?: string) => {
    const p = state.payments.find(x => x.id === paymentId);
    // Defensive guard / Idempotency: cannot confirm an already paid payment
    if (!p || p.status === 'paid') return;

    const confirmedBy = state.currentUser?.name || 'Staff';
    const paidAt = new Date().toISOString();
    try {
      await updateRecord('payments', paymentId, { status: 'paid', confirmedBy, paidAt });
      if (orderId) {
        const o = state.orders.find(x => x.id === orderId);
        if (o) {
          await saveRecord('orders', {
            ...o,
            paymentStatus: 'paid',
            status: 'completed',
            confirmedBy,
            updatedAt: paidAt
          });
        } else {
          await updateRecord('orders', orderId, {
            paymentStatus: 'paid',
            status: 'completed',
            confirmedBy,
            updatedAt: paidAt
          });
        }
      }
      // Single authoritative audit created by reducer deriveAudit
      dispatch({ type: 'CONFIRM_CASH_PAYMENT', paymentId, confirmedBy });
      showToast('success', 'Cash payment confirmed!');
    } catch (err: any) {
      showToast('error', 'Failed to confirm cash: ' + err.message);
    }
  };

  const role = state.currentUser?.role || 'employee';

  return (
    <InternalLayout title="Orders">
      <div className="space-y-5">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders or customer…" className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] transition-all" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm text-[#10212B] focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30">
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F7F8F6] flex items-center justify-between">
            <div className="text-sm font-700 text-[#10212B]">Orders ({orders.length})</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider border-b border-[#F7F8F6]">
                  <th className="text-left px-5 py-3">Order</th>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-5 py-3">Items</th>
                  <th className="text-left px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Payment</th>
                  <th className="text-left px-5 py-3">Status</th>
                  {(role === 'employee' || role === 'supervisor' || role === 'admin') && <th className="text-left px-5 py-3">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {orders.map(order => {
                  const customer = getCustomer(order.customerId);
                  const cashPay = state.payments.find(p => p.orderId === order.id && p.method === 'cash' && p.status === 'pending');
                  const orderItems = Array.isArray(order.items) ? order.items : order.items ? Object.values(order.items) : [];
                  return (
                    <tr key={order.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-700 text-sm text-[#10212B]">{order.orderNo || order.id || '—'}</div>
                        <div className="text-[11px] text-[#65727A]">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-[#10212B]">{customer?.fullName || 'Walk-in / Unregistered'}</div>
                        <div className="text-[11px] text-[#65727A]">{customer?.storeName || '—'}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#65727A]">{orderItems.length} items</td>
                      <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(order.total)}</td>
                      <td className="px-5 py-3 text-xs text-[#65727A] capitalize">{order.paymentType || '—'}</td>
                      <td className="px-5 py-3"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-5 py-3">
                        {order.status === 'completed' || order.status === 'cancelled' ? (
                          <span className="text-[#65727A] text-xs font-500">—</span>
                        ) : order.status === 'pending_financing' ? (
                          role === 'admin' || role === 'supervisor' ? (
                            <button
                              onClick={() => navigate(role === 'admin' ? 'admin/financing' : 'supervisor/financing')}
                              className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-600 rounded-lg hover:bg-amber-100 transition-all cursor-pointer"
                            >
                              Review Financing
                            </button>
                          ) : (
                            <span className="text-amber-600 text-xs font-500">Awaiting Approval</span>
                          )
                        ) : cashPay ? (
                          <button
                            onClick={() => handleConfirmCash(cashPay.id, order.id)}
                            className="px-2.5 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-lg hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20"
                          >
                            Confirm Cash & Complete
                          </button>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => updateStatus(order.id, 'completed')}
                              className="px-2.5 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-lg hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => updateStatus(order.id, 'cancelled')}
                              className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-600 rounded-lg hover:bg-red-100 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="text-center py-12 text-[#65727A] text-sm">No orders found</div>
            )}
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
