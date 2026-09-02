import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { OrderStatusBadge } from '../../components/ui/Badge';
import type { OrderStatus } from '../../types';

export function OrdersManagementPage() {
  const { state, dispatch, getCustomer, showToast, formatPHP } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const role = state.currentUser?.role || 'employee';

  const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'pending_financing', label: 'Pending Financing' },
    { value: 'processing', label: 'Processing' },
    { value: 'ready', label: 'Ready' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const orders = state.orders.filter(o => {
    const customer = getCustomer(o.customerId);
    const matchesSearch = search === '' || o.orderNo.toLowerCase().includes(search.toLowerCase()) || customer?.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const updateStatus = (orderId: string, status: OrderStatus) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', orderId, status, confirmedBy: state.currentUser!.name });
    showToast('success', `Order status updated to ${status.replace('_', ' ')}.`);
  };

  const STATUS_FLOW: Record<string, OrderStatus[]> = {
    processing: ['ready'],
    ready: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
    delivered: ['completed'],
  };

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
                  const nextStatuses = STATUS_FLOW[order.status] || [];
                  const cashPay = state.payments.find(p => p.orderId === order.id && p.method === 'cash' && p.status === 'pending');
                  return (
                    <tr key={order.id} className="hover:bg-[#F7F8F6]/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-700 text-sm text-[#10212B]">{order.orderNo}</div>
                        <div className="text-[11px] text-[#65727A]">{new Date(order.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-[#10212B]">{customer?.fullName}</div>
                        <div className="text-[11px] text-[#65727A]">{customer?.storeName}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#65727A]">{order.items.length} items</td>
                      <td className="px-5 py-3 font-700 text-sm text-[#10212B]">{formatPHP(order.total)}</td>
                      <td className="px-5 py-3 text-xs text-[#65727A] capitalize">{order.paymentType}</td>
                      <td className="px-5 py-3"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {cashPay && (
                            <button
                              onClick={() => { dispatch({ type: 'CONFIRM_CASH_PAYMENT', paymentId: cashPay.id, confirmedBy: state.currentUser!.name }); showToast('success', 'Cash confirmed!'); }}
                              className="px-2.5 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-lg hover:bg-[#22913f] transition-all"
                            >
                              Confirm Cash
                            </button>
                          )}
                          {nextStatuses.map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(order.id, s)}
                              className="px-2.5 py-1.5 bg-[#0D2B45] text-white text-xs font-600 rounded-lg hover:bg-[#1a3d5c] transition-all capitalize"
                            >
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
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
