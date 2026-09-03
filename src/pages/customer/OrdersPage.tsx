import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { saveRecord } from '../../services/firebase/rtdbService';
import type { OrderItem } from '../../types';

export function OrdersPage() {
  const { state, navigate, getCurrentCustomer, getCustomerOrders, dispatch, showToast, formatPHP, logAudit } = useApp();
  const customer = getCurrentCustomer();
  const orders = getCustomerOrders(customer?.id || '').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const cancelOrder = (orderId: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', orderId, status: 'cancelled' });
    showToast('success', 'Order cancelled successfully.');
  };

  const handleConfirmReceived = async (orderId: string) => {
    const target = state.orders.find(o => o.id === orderId);
    if (!target) return;

    const updated = {
      ...target,
      status: 'completed' as const,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveRecord('orders', updated);
    } catch (e) {
      console.warn('Failed to sync to RTDB:', e);
    }

    dispatch({ type: 'UPDATE_ORDER_STATUS', orderId, status: 'completed' });
    await logAudit({
      category: 'order',
      action: 'order.receive',
      summary: `Store Owner ${customer?.fullName || 'Customer'} confirmed delivery receipt of order ${target.orderNo}`,
      targetType: 'order',
      targetId: orderId,
      targetLabel: target.orderNo,
    });
    showToast('success', `Order ${target.orderNo} confirmed received and marked completed!`);
  };

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-3.5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45]">My Orders</h1>
          <button
            onClick={() => navigate('customer/shop')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E7D3B] text-white font-600 text-sm rounded-xl hover:bg-[#22913f] transition-all cursor-pointer self-start sm:self-auto shadow-sm shadow-[#1E7D3B]/20"
          >
            + New Order
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E4E8E6]">
            <div className="text-3xl mb-3">📦</div>
            <div className="font-700 text-[#10212B] mb-1">No orders yet</div>
            <div className="text-sm text-[#65727A] mb-4">Start shopping to place your first order.</div>
            <button onClick={() => navigate('customer/shop')} className="text-sm text-[#1E7D3B] font-600 hover:underline cursor-pointer">Browse Shop →</button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const canCancel = order.status === 'pending_payment' || order.status === 'pending_financing';
              return (
                <div
                  key={order.id}
                  data-tour-target={order.id === 'ord_tour_001' ? '4' : undefined}
                  className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="font-800 text-base text-[#10212B]">{order.orderNo}</div>
                      <div className="text-xs text-[#65727A] mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>

                  {(() => {
                    const orderItems = (Array.isArray(order.items) ? order.items : order.items ? Object.values(order.items) : []) as OrderItem[];
                    return (
                      <div className="space-y-1.5 mb-4">
                        {orderItems.slice(0, 3).map(item => (
                          <div key={item.productId} className="flex justify-between text-sm">
                            <span className="text-[#65727A]">{item.productName} ×{item.quantity}</span>
                            <span className="font-600 text-[#10212B]">{formatPHP(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        {orderItems.length > 3 && (
                          <div className="text-xs text-[#65727A]">+{orderItems.length - 3} more items</div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="border-t border-[#F7F8F6] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-xs text-[#65727A]">Total: </span>
                        <span className="font-800 text-[#0D2B45]">{formatPHP(order.total)}</span>
                      </div>
                      <div className="text-xs text-[#65727A] capitalize">
                        {order.paymentType === 'split' ? 'Split Payment' :
                         order.paymentType === 'financing' ? 'Sari-Fi Financing' :
                         order.paymentType.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === 'delivered' && (
                        <button
                          onClick={() => handleConfirmReceived(order.id)}
                          className="px-3.5 py-1.5 bg-[#1E7D3B] hover:bg-[#165f2c] text-white text-xs font-700 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Confirm Order Received</span>
                        </button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <div className="text-xs text-blue-700 font-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 flex items-center gap-1">
                          <span>🚚 Out for Delivery</span>
                        </div>
                      )}
                      {order.paymentType === 'cash' && order.paymentStatus === 'pending' && (
                        <div className="text-xs text-amber-600 font-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          Awaiting Cash Confirmation
                        </div>
                      )}
                      {order.financingId && (
                        <button
                          onClick={() => navigate('customer/financing')}
                          className="text-xs text-[#1E7D3B] font-600 hover:underline"
                        >
                          View Financing →
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="text-xs text-red-500 hover:text-red-600 font-500"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
