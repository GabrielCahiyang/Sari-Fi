import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { CATEGORY_META, relativeTime } from '../../data/audit';

export function AdminDashboard() {
  const { state, navigate, getCustomer, formatPHP } = useApp();

  const totalSales = state.payments.filter(p => p.status === 'paid' && p.type === 'purchase').reduce((s, p) => s + p.amount, 0);
  const activeFinancing = state.financing.filter(f => f.status === 'active');
  const totalActive = activeFinancing.reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
  const collected = state.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const overdue = state.financing.filter(f => f.status === 'overdue').reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);

  const recentOrders = state.orders.slice(0, 6);
  const pendingFinancing = state.financing.filter(f => f.status === 'pending').length;
  
  // Top products by total value
  const topProducts = state.products
    .map(p => ({ ...p, revenue: p.sellingPrice * (120 - p.stock) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const paymentMethodBreakdown = state.payments
    .filter(p => p.status === 'paid')
    .reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
      return acc;
    }, { cash: 0, gcash: 0 } as Record<string, number>);

  const totalBreakdown = paymentMethodBreakdown.cash + paymentMethodBreakdown.gcash;
  const cashPercent = totalBreakdown ? Math.round(paymentMethodBreakdown.cash / totalBreakdown * 100) : 0;
  const gcashPercent = totalBreakdown ? Math.round(paymentMethodBreakdown.gcash / totalBreakdown * 100) : 0;

  return (
    <InternalLayout title="Admin Dashboard">
      <div className="space-y-5">
        {/* Primary KPI Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Total Sales</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1E7D3B] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div>
              <div className="font-800 text-xl sm:text-2xl mt-1 text-[#10212B] truncate">{formatPHP(totalSales)}</div>
              <div className="text-emerald-700 font-600 text-[11px] mt-1">Purchase orders settled</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Active Financing</span>
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
            </div>
            <div>
              <div className="font-800 text-xl sm:text-2xl mt-1 text-[#10212B] truncate">{formatPHP(Math.round(totalActive))}</div>
              <div className="text-[#65727A] text-[11px] mt-1">{activeFinancing.length} active credit accounts</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Collected (All)</span>
              <span className="w-8 h-8 rounded-xl bg-slate-100 text-[#0D2B45] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </span>
            </div>
            <div>
              <div className="text-[#10212B] font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(collected)}</div>
              <div className="text-[#65727A] text-[11px] mt-1">Total revenue processed</div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`rounded-2xl p-4 sm:p-5 border shadow-xs flex flex-col justify-between ${
              overdue > 0 ? 'bg-red-50/40 border-red-200' : 'bg-white border-[#E4E8E6]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-700 uppercase tracking-wider text-[#65727A]">Overdue Amount</span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${overdue > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-[#65727A]'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div>
              <div className={`font-800 text-xl sm:text-2xl mt-1 truncate ${overdue > 0 ? 'text-red-600' : 'text-[#10212B]'}`}>
                {formatPHP(Math.round(overdue))}
              </div>
              <div className={`text-[11px] mt-1 ${overdue > 0 ? 'text-red-600 font-600' : 'text-[#65727A]'}`}>
                {overdue > 0 ? 'Past due installments' : 'No overdue accounts'}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Secondary Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl border border-[#E4E8E6] p-3.5 sm:p-4 shadow-xs"
          >
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Orders Today</div>
            <div className="text-[#0D2B45] font-800 text-xl sm:text-2xl mt-1">{state.orders.length}</div>
            <button onClick={() => navigate('admin/orders')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline cursor-pointer">View →</button>
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl border border-[#E4E8E6] p-3.5 sm:p-4 shadow-xs"
          >
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Customers</div>
            <div className="text-[#0D2B45] font-800 text-xl sm:text-2xl mt-1">{state.customers.length}</div>
            <button onClick={() => navigate('admin/customers')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline cursor-pointer">View →</button>
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white rounded-2xl border border-[#E4E8E6] p-3.5 sm:p-4 shadow-xs"
          >
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Wholesale Suppliers</div>
            <div className="text-[#0D2B45] font-800 text-xl sm:text-2xl mt-1">{state.suppliers.length}</div>
            <button onClick={() => navigate('admin/suppliers')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline cursor-pointer">View →</button>
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`rounded-2xl p-3.5 sm:p-4 border shadow-xs ${pendingFinancing > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E4E8E6]'}`}
          >
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Pending Financing</div>
            <div className="text-[#10212B] font-800 text-xl sm:text-2xl mt-1">{pendingFinancing}</div>
            <button onClick={() => navigate('admin/financing')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline cursor-pointer">Review →</button>
          </motion.div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Recent Orders */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-700 text-sm text-[#10212B]">Recent Orders</div>
              <button onClick={() => navigate('admin/orders')} className="text-xs text-[#1E7D3B] font-600 hover:underline cursor-pointer">View all →</button>
            </div>
            <div className="space-y-2">
              {recentOrders.map(order => {
                const customer = getCustomer(order.customerId);
                const orderItems = Array.isArray(order.items) ? order.items : order.items ? Object.values(order.items) : [];
                return (
                  <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-[#F7F8F6] last:border-0 gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-[#F7F8F6] rounded-xl flex items-center justify-center text-[11px] font-700 text-[#65727A] shrink-0">
                        {orderItems.length}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-600 text-[#10212B] truncate">{order.orderNo}</div>
                        <div className="text-[11px] text-[#65727A] truncate">{customer?.fullName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="font-700 text-xs sm:text-sm text-[#10212B]">{formatPHP(order.total)}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            {/* Payment breakdown */}
            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
              <div className="font-700 text-sm text-[#10212B] mb-4">Payment Method Breakdown</div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-600 text-[#10212B]">Cash</span>
                    <span className="font-600 text-[#65727A]">{cashPercent}%</span>
                  </div>
                  <div className="bg-[#F7F8F6] rounded-full h-2">
                    <div className="bg-[#0D2B45] h-2 rounded-full" style={{ width: `${cashPercent}%` }} />
                  </div>
                  <div className="text-xs text-[#65727A] mt-0.5">{formatPHP(paymentMethodBreakdown.cash)}</div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-600 text-[#10212B]">GCash</span>
                    <span className="font-600 text-[#65727A]">{gcashPercent}%</span>
                  </div>
                  <div className="bg-[#F7F8F6] rounded-full h-2">
                    <div className="bg-[#7DBE4C] h-2 rounded-full" style={{ width: `${gcashPercent}%` }} />
                  </div>
                  <div className="text-xs text-[#65727A] mt-0.5">{formatPHP(paymentMethodBreakdown.gcash)}</div>
                </div>
              </div>
            </div>

            {/* Top products */}
            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
              <div className="font-700 text-sm text-[#10212B] mb-3">Top Products</div>
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-[#F7F8F6] last:border-0">
                    <div className="w-5 h-5 bg-[#0D2B45] rounded-lg flex items-center justify-center text-[10px] font-700 text-white shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-600 text-[#10212B] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#65727A]">{p.category}</div>
                    </div>
                    <div className="text-xs font-700 text-[#1E7D3B] shrink-0">{formatPHP(p.sellingPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="col-span-12 bg-white rounded-2xl border border-[#E4E8E6] p-5 shadow-soft-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="font-700 text-sm text-[#10212B]">Recent Activity</div>
              <button onClick={() => navigate('admin/audit')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View audit trail →</button>
            </div>
            <div className="space-y-1">
              {state.auditLog.slice(0, 8).map(entry => {
                const meta = CATEGORY_META[entry.category];
                return (
                  <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-[#F7F8F6] last:border-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.tint}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={meta.icon} /></svg>
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm text-[#10212B] leading-snug">{entry.summary}</div>
                      <div className="text-[11px] text-[#65727A] mt-0.5">{entry.actorName} · {relativeTime(entry.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
