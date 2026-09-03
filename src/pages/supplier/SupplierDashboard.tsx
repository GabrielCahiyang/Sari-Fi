import { useMemo } from 'react';
import { SupplierLayout } from '../../components/layout/SupplierLayout';
import { useApp } from '../../context/AppContext';
import { saveRecord } from '../../services/firebase/rtdbService';
import type { OrderStatus } from '../../types';

export function SupplierDashboard() {
  const { state, dispatch, formatPHP, navigate, showToast } = useApp();

  const supplier = useMemo(() => {
    return state.suppliers.find(s => s.id === state.currentUser?.supplierId) || {
      id: state.currentUser?.supplierId || 'sup1',
      name: state.currentUser?.name || 'Wholesale Supplier',
      email: state.currentUser?.email || 'supplier@sarifi.ph',
      status: 'active' as const,
    };
  }, [state.suppliers, state.currentUser]);

  // Supplier's own products
  const myProducts = useMemo(() => {
    return state.products.filter(p => p.supplierId === supplier.id);
  }, [state.products, supplier.id]);

  const totalStockValue = useMemo(() => {
    return myProducts.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
  }, [myProducts]);

  const lowStockProducts = useMemo(() => {
    return myProducts.filter(p => p.stock <= p.reorderLevel);
  }, [myProducts]);

  // Orders that contain this supplier's products
  const myOrders = useMemo(() => {
    return state.orders.filter(o =>
      o.items.some(it => myProducts.some(p => p.id === it.productId))
    );
  }, [state.orders, myProducts]);

  const pendingOrders = useMemo(() => {
    return myOrders.filter(o => o.status === 'processing' || o.status === 'approved');
  }, [myOrders]);

  const completedOrdersCount = useMemo(() => {
    return myOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
  }, [myOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const target = state.orders.find(o => o.id === orderId);
    if (!target) return;

    const updated = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveRecord('orders', updated);
    } catch (err) {
      console.warn('Failed to update order status in RTDB:', err);
    }

    dispatch({ type: 'UPDATE_ORDER_STATUS', orderId, status: newStatus });
    showToast('success', `Order ${target.orderNo} updated to "${newStatus.replace(/_/g, ' ')}".`);
  };

  return (
    <SupplierLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] tracking-tight">
              {supplier.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#65727A] mt-1">
              Manage your wholesale catalog, monitor sari-sari store orders, and replenish inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('supplier/products')}
              className="px-3.5 py-2 text-xs font-700 bg-[#0D2B45] text-white hover:bg-[#153e61] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
            <button
              onClick={() => navigate('supplier/inventory')}
              className="px-3.5 py-2 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Resupply Stock
            </button>
          </div>
        </div>

        {/* Bento KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-600 text-[#65727A]">Warehouse Goods Value</span>
              <span className="p-2 rounded-xl bg-[#E8F5E9] text-[#1E7D3B]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-lg sm:text-2xl font-800 text-[#0D2B45] tnum">
              {formatPHP(totalStockValue)}
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">At wholesale cost value</div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-600 text-[#65727A]">Active Listed SKUs</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-lg sm:text-2xl font-800 text-[#0D2B45] tnum">
              {myProducts.length}
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">Available for sari-sari stores</div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-600 text-[#65727A]">Orders to Fulfill</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-lg sm:text-2xl font-800 text-[#0D2B45] tnum">
              {pendingOrders.length}
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">Needs packaging / dispatch</div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E4E8E6] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-600 text-[#65727A]">Low Stock Alerts</span>
              <span className={`p-2 rounded-xl ${lowStockProducts.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div className={`mt-3 text-lg sm:text-2xl font-800 tnum ${lowStockProducts.length > 0 ? 'text-red-600' : 'text-[#0D2B45]'}`}>
              {lowStockProducts.length}
            </div>
            <div className="text-[11px] text-[#65727A] mt-0.5">Items at or below reorder level</div>
          </div>
        </div>

        {/* Grid: Orders Needing Dispatch & Low Stock Items */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Orders Section */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-700 text-[#0D2B45]">Pending Store Orders</h2>
                <p className="text-xs text-[#65727A]">Orders placed by sari-sari stores for your goods</p>
              </div>
              <button
                onClick={() => navigate('supplier/orders')}
                className="text-xs font-700 text-[#1E7D3B] hover:underline cursor-pointer"
              >
                View All ({myOrders.length}) →
              </button>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="py-12 text-center text-[#65727A] text-sm">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F7F8F6] flex items-center justify-center text-[#A0AEC0]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                All pending store orders have been dispatched! Great job.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.slice(0, 5).map(o => {
                  const customer = state.customers.find(c => c.id === o.customerId);
                  const itemsForThisSupplier = o.items.filter(it => myProducts.some(p => p.id === it.productId));
                  const supplierSubtotal = itemsForThisSupplier.reduce((s, it) => s + (it.price * it.quantity), 0);

                  return (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-xl border border-[#E4E8E6] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-800 text-sm text-[#0D2B45]">{o.orderNo}</span>
                          <span className="text-[10px] font-700 uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            {o.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-xs font-600 text-[#10212B] mt-1">
                          {customer ? customer.storeName : 'Sari-Sari Store'}
                        </div>
                        <div className="text-[11px] text-[#65727A]">
                          {itemsForThisSupplier.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E4E8E6]">
                        <div className="text-right">
                          <div className="text-xs text-[#65727A]">Subtotal</div>
                          <div className="text-sm font-800 text-[#1E7D3B] tnum">{formatPHP(supplierSubtotal)}</div>
                        </div>

                        {o.status === 'processing' || o.status === 'approved' ? (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'out_for_delivery')}
                            className="px-3 py-1.5 text-xs font-700 bg-[#0D2B45] text-white hover:bg-[#194368] rounded-lg transition-colors cursor-pointer"
                          >
                            Dispatch
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'delivered')}
                            className="px-3 py-1.5 text-xs font-700 bg-[#1E7D3B] text-white hover:bg-[#165f2c] rounded-lg transition-colors cursor-pointer"
                          >
                            Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Low Stock Alerts Section */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-700 text-[#0D2B45]">Stock Needs Attention</h2>
                <p className="text-xs text-[#65727A]">Replenish goods so stores can keep ordering</p>
              </div>
              <button
                onClick={() => navigate('supplier/inventory')}
                className="text-xs font-700 text-[#1E7D3B] hover:underline cursor-pointer"
              >
                Resupply Hub →
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-12 text-center text-[#65727A] text-sm">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1E7D3B]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                All warehouse stocks are above reorder threshold.
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.slice(0, 6).map(p => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-red-100 bg-red-50/50 flex items-center justify-between gap-2"
                  >
                    <div className="overflow-hidden">
                      <div className="font-700 text-xs text-[#0D2B45] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#65727A]">
                        SKU: {p.sku} · Reorder at: {p.reorderLevel}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-800 text-red-600 bg-red-100 px-2 py-0.5 rounded-md tnum">
                        {p.stock} left
                      </span>
                      <button
                        onClick={() => navigate('supplier/inventory')}
                        className="px-2.5 py-1 text-[11px] font-700 bg-white text-[#0D2B45] border border-[#E4E8E6] hover:border-[#1E7D3B] rounded-lg transition-colors cursor-pointer"
                      >
                        + Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SupplierLayout>
  );
}
