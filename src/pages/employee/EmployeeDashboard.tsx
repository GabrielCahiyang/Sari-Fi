import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { OrderStatusBadge, Badge } from '../../components/ui/Badge';
import { settleOrderPayment } from '../../services/firebase/rtdbService';

export function EmployeeDashboard() {
  const { state, dispatch, navigate, getCustomer, showToast, formatPHP } = useApp();

  const todayOrders = state.orders.filter(o => o.createdAt.startsWith('2025-08-30') || o.createdAt.startsWith('2025-08-28'));
  const pendingCash = state.payments.filter(p => p.status === 'pending' && p.method === 'cash');
  const readyOrders = state.orders.filter(o => o.status === 'ready');
  const lowStock = state.products.filter(p => p.stock <= p.reorderLevel && p.stock > 0);
  const outOfStock = state.products.filter(p => p.stock === 0);

  const confirmCash = async (paymentId: string) => {
    const payment = state.payments.find(item => item.id === paymentId);
    if (!payment || payment.status !== 'pending') return;
    if (payment.type === 'installment' || payment.type === 'full_settlement') {
      showToast('error', 'Only a supervisor can confirm cash financing repayments.');
      return;
    }
    const confirmedBy = state.currentUser?.name || 'Employee';
    try {
      await settleOrderPayment(paymentId, confirmedBy, state.currentUser?.role);
      dispatch({ type: 'CONFIRM_CASH_PAYMENT', paymentId, confirmedBy });
      showToast('success', 'Cash payment confirmed. Order is now processing.');
    } catch (err: any) {
      showToast('error', 'Failed to confirm cash: ' + (err?.message || 'Please try again.'));
    }
  };

  return (
    <InternalLayout title="Employee Dashboard">
      <div className="space-y-5">
        {/* KPI Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-3.5 sm:p-5">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Orders Today</div>
            <div className="text-[#0D2B45] font-800 text-2xl sm:text-3xl mt-1 sm:mt-2">{todayOrders.length}</div>
          </div>
          <div className="bg-[#FFF8E1] border border-[#FFC107]/30 rounded-2xl p-3.5 sm:p-5">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Cash Awaiting</div>
            <div className="text-[#10212B] font-800 text-2xl sm:text-3xl mt-1 sm:mt-2">{pendingCash.length}</div>
            <div className="text-xs text-amber-600 mt-1">Needs confirmation</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-3.5 sm:p-5">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Ready to Deliver</div>
            <div className="text-[#0D2B45] font-800 text-2xl sm:text-3xl mt-1 sm:mt-2">{readyOrders.length}</div>
          </div>
          <div className={`rounded-2xl border p-3.5 sm:p-5 ${lowStock.length > 0 || outOfStock.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Low / Out of Stock</div>
            <div className="text-[#0D2B45] font-800 text-2xl sm:text-3xl mt-1 sm:mt-2">{lowStock.length + outOfStock.length}</div>
            <div className="text-xs text-red-500 mt-1">{outOfStock.length} out of stock</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Cash Awaiting Confirmation */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-700 text-sm text-[#10212B]">Cash Payments — Needs Confirmation</div>
              {pendingCash.length > 0 && <span className="text-xs bg-[#FFC107] text-[#0D2B45] font-700 px-2 py-0.5 rounded-full">{pendingCash.length}</span>}
            </div>
            {pendingCash.length === 0 ? (
              <div className="text-center py-8 text-[#65727A] text-sm">No pending cash confirmations</div>
            ) : (
              <div className="space-y-3">
                {pendingCash.map(pay => {
                  const customer = getCustomer(pay.customerId);
                  const supervisorRequired = pay.type === 'installment' || pay.type === 'full_settlement';
                  return (
                    <div key={pay.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div>
                        <div className="font-600 text-sm text-[#10212B]">{customer?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-[#65727A]">{pay.paymentNo} · {formatPHP(pay.amount)} Cash</div>
                        <div className="text-xs text-[#65727A]">
                          {supervisorRequired ? 'Financing repayment · Supervisor approval required' : 'Order payment'}
                        </div>
                      </div>
                      <button
                        onClick={() => confirmCash(pay.id)}
                        disabled={supervisorRequired}
                        className="px-4 py-2 bg-[#1E7D3B] text-white text-sm font-600 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer self-start sm:self-auto shadow-sm shadow-[#1E7D3B]/20 disabled:bg-[#E4E8E6] disabled:text-[#65727A] disabled:shadow-none disabled:cursor-not-allowed"
                      >
                        {supervisorRequired ? 'Supervisor Required' : 'Confirm Cash Received'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-700 text-sm text-[#10212B]">Recent Orders</div>
              <button onClick={() => navigate('employee/orders')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View all →</button>
            </div>
            <div className="space-y-3">
              {state.orders.slice(0, 6).map(order => {
                const customer = getCustomer(order.customerId);
                return (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-[#F7F8F6] last:border-0">
                    <div>
                      <div className="font-600 text-sm text-[#10212B]">{order.orderNo}</div>
                      <div className="text-xs text-[#65727A]">{customer?.storeName || 'Unknown'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-xs text-[#65727A]">{formatPHP(order.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock */}
          {lowStock.length > 0 && (
            <div className="col-span-12 bg-white rounded-2xl border border-[#E4E8E6] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-700 text-sm text-[#10212B]">Low Stock Alerts</div>
                <button onClick={() => navigate('employee/inventory')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View Inventory →</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lowStock.slice(0, 8).map(p => (
                  <div key={p.id} className={`p-3 rounded-xl border ${p.stock === 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="font-600 text-xs text-[#10212B] leading-tight mb-1">{p.name}</div>
                    <div className={`text-lg font-800 ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stock}</div>
                    <div className="text-[11px] text-[#65727A]">Reorder at {p.reorderLevel}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </InternalLayout>
  );
}
