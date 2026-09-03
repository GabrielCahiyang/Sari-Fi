import { useState, useMemo } from 'react';
import { SupplierLayout } from '../../components/layout/SupplierLayout';
import { useApp } from '../../context/AppContext';
import { transitionOrderFlow } from '../../services/firebase/rtdbService';
import type { OrderStatus, Order } from '../../types';
import { canTransitionOrder } from '../../domain/orderFlow';

export function SupplierOrdersPage() {
  const { state, dispatch, formatPHP, showToast } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready' | 'out_for_delivery' | 'delivered'>('all');
  const [search, setSearch] = useState('');

  const supplier = useMemo(() => {
    return state.suppliers.find(s => s.id === state.currentUser?.supplierId) || {
      id: state.currentUser?.supplierId || 'sup1',
      name: state.currentUser?.name || 'Wholesale Supplier',
      email: state.currentUser?.email || 'supplier@sarifi.ph',
      status: 'active' as const,
    };
  }, [state.suppliers, state.currentUser]);

  // Supplier's own products
  const myProductIds = useMemo(() => {
    return new Set(state.products.filter(p => p.supplierId === supplier.id).map(p => p.id));
  }, [state.products, supplier.id]);

  // Orders that contain at least one item from this supplier
  const myOrders = useMemo(() => {
    return state.orders.filter(o =>
      ['processing', 'ready', 'out_for_delivery', 'delivered', 'completed'].includes(o.status) &&
      o.items.some(it => myProductIds.has(it.productId))
    );
  }, [state.orders, myProductIds]);

  const filteredOrders = useMemo(() => {
    return myOrders.filter(o => {
      const customer = state.customers.find(c => c.id === o.customerId);
      const storeName = customer?.storeName || '';
      const matchSearch = o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
        storeName.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'pending') {
        return o.status === 'processing';
      }
      if (statusFilter === 'ready') {
        return o.status === 'ready';
      }
      if (statusFilter === 'out_for_delivery') {
        return o.status === 'out_for_delivery';
      }
      if (statusFilter === 'delivered') {
        return o.status === 'delivered' || o.status === 'completed';
      }
      return true;
    });
  }, [myOrders, search, statusFilter, state.customers]);

  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus) => {
    if (!canTransitionOrder(order.status, newStatus) || newStatus === 'completed') {
      showToast('error', 'That supplier status transition is not allowed.');
      return;
    }
    try {
      await transitionOrderFlow(order.id, newStatus, 'supplier');
      dispatch({ type: 'UPDATE_ORDER_STATUS', orderId: order.id, status: newStatus });
      showToast('success', `Order ${order.orderNo} updated to "${newStatus.replace(/_/g, ' ')}".`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to update order status: ' + err.message);
    }
  };

  return (
    <SupplierLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] tracking-tight">
              Orders to Fulfill
            </h1>
            <p className="text-xs sm:text-sm text-[#65727A] mt-1">
              Fulfill and dispatch wholesale orders placed by registered sari-sari stores.
            </p>
          </div>

          <div className="text-xs text-[#65727A] bg-[#F7F8F6] px-3.5 py-2 rounded-xl border border-[#E4E8E6] font-600">
            Total Orders: <span className="font-800 text-[#0D2B45]">{myOrders.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#65727A] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by order # or store name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'All Orders' },
              { key: 'pending', label: 'To Dispatch' },
              { key: 'ready', label: 'Ready' },
              { key: 'out_for_delivery', label: 'In Transit' },
              { key: 'delivered', label: 'Delivered' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-700 whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#0D2B45] text-white'
                    : 'bg-white text-[#65727A] border border-[#E4E8E6] hover:border-[#1E7D3B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-12 text-center text-[#65727A]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F7F8F6] flex items-center justify-center text-[#A0AEC0]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="font-800 text-sm text-[#0D2B45]">No orders matching criteria</div>
            <div className="text-xs mt-1">Try switching filters or check back when new orders are placed.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(o => {
              const customer = state.customers.find(c => c.id === o.customerId);
              const itemsForThisSupplier = o.items.filter(it => myProductIds.has(it.productId));
              const supplierSubtotal = itemsForThisSupplier.reduce((s, it) => s + (it.price * it.quantity), 0);

              const isPending = o.status === 'processing';
              const isReady = o.status === 'ready';
              const isInTransit = o.status === 'out_for_delivery';
              const isDelivered = o.status === 'delivered' || o.status === 'completed';

              return (
                <div
                  key={o.id}
                  data-tour-target={o.id === 'ord_tour_001' ? '3' : undefined}
                  className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 shadow-xs transition-all hover:border-[#1E7D3B]/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E8E6]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-900 text-sm sm:text-base text-[#0D2B45] tracking-tight">
                          {o.orderNo}
                        </span>
                        <span className={`text-[10px] font-700 uppercase px-2 py-0.5 rounded-md ${
                          isPending ? 'bg-amber-100 text-amber-800'
                            : isInTransit ? 'bg-blue-100 text-blue-800'
                            : isDelivered ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-700 uppercase px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#1E7D3B]">
                          Paid via {o.paymentType}
                        </span>
                      </div>
                      <div className="text-xs text-[#65727A] mt-0.5">
                        Placed on {new Date(o.createdAt).toLocaleDateString()} at {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-[#65727A]">Supplier Total</div>
                      <div className="text-base sm:text-lg font-900 text-[#1E7D3B] tnum">
                        {formatPHP(supplierSubtotal)}
                      </div>
                    </div>
                  </div>

                  {/* Customer Store Details & Delivery Destination */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 p-3 rounded-xl bg-[#F7F8F6] text-xs">
                    <div>
                      <div className="text-[10px] font-700 uppercase tracking-wider text-[#65727A]">
                        Destination Sari-Sari Store
                      </div>
                      <div className="font-800 text-sm text-[#0D2B45] mt-0.5">
                        {customer?.storeName || 'Sari-Sari Store'}
                      </div>
                      <div className="text-[#4A5568] mt-0.5">
                        Owner: <span className="font-600">{customer?.fullName || 'Store Owner'}</span>
                      </div>
                      <div className="text-[#65727A] mt-0.5">
                        Phone: <span className="font-600">{customer?.phone || 'N/A'}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-700 uppercase tracking-wider text-[#65727A]">
                        Store Address
                      </div>
                      <div className="font-600 text-[#0D2B45] mt-0.5">
                        {customer?.storeAddress || customer?.address || 'Metro Manila'}
                      </div>
                      <div className="text-[11px] text-[#1E7D3B] font-600 mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Financed & Guaranteed by Sari-Fi Middleman
                      </div>
                    </div>
                  </div>

                  {/* Items to Pack */}
                  <div className="my-3">
                    <div className="text-[11px] font-700 text-[#65727A] uppercase tracking-wider mb-2">
                      Items to Pack ({itemsForThisSupplier.length} items)
                    </div>
                    <div className="divide-y divide-[#E4E8E6] border border-[#E4E8E6] rounded-xl overflow-hidden bg-white">
                      {itemsForThisSupplier.map(it => (
                        <div key={it.productId} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-800 text-sm text-[#0D2B45] bg-[#F0F2F1] px-2 py-1 rounded-md tnum">
                              {it.quantity}x
                            </span>
                            <span className="font-700 text-[#10212B]">{it.productName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-700 text-[#0D2B45] tnum">{formatPHP(it.price * it.quantity)}</div>
                            <div className="text-[10px] text-[#65727A] tnum">{formatPHP(it.price)} each</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(o, 'ready')}
                        className="px-4 py-2 text-xs font-700 bg-[#0D2B45] text-white hover:bg-[#194368] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Mark Ready
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => handleUpdateStatus(o, 'out_for_delivery')}
                        className="px-4 py-2 text-xs font-700 bg-[#0D2B45] text-white hover:bg-[#194368] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        Dispatch / Out for Delivery
                      </button>
                    )}

                    {isInTransit && (
                      <button
                        onClick={() => handleUpdateStatus(o, 'delivered')}
                        className="px-4 py-2 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm Delivered to Store
                      </button>
                    )}

                    {isDelivered && (
                      <div className="text-xs font-700 text-[#1E7D3B] flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5E9] rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Order Fulfilled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
