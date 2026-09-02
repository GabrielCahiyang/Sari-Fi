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
  const lowStock = state.products.filter(p => p.stock <= p.reorderLevel).length;
  const cashPending = state.payments.filter(p => p.status === 'pending' && p.method === 'cash').length;

  // Top products by total value
  const topProducts = state.products
    .map(p => ({ ...p, revenue: p.sellingPrice * (120 - p.stock) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const paymentMethodBreakdown = {
    cash: state.payments.filter(p => p.method === 'cash' && p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    gcash: state.payments.filter(p => p.method === 'gcash' && p.status === 'paid').reduce((s, p) => s + p.amount, 0),
  };
  const totalBreakdown = paymentMethodBreakdown.cash + paymentMethodBreakdown.gcash;
  const cashPercent = totalBreakdown ? Math.round(paymentMethodBreakdown.cash / totalBreakdown * 100) : 0;
  const gcashPercent = 100 - cashPercent;

  return (
    <InternalLayout title="Admin Dashboard">
      <div className="space-y-5">
        {/* Primary KPI Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D2B45] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="text-white/60 text-xs font-600 uppercase tracking-wider">Total Sales</div>
            <div className="text-white font-800 text-2xl mt-2">{formatPHP(totalSales)}</div>
            <div className="text-[#7DBE4C] text-xs mt-1">Purchase payments</div>
          </div>
          <div className="bg-[#1E7D3B] rounded-2xl p-5">
            <div className="text-white/70 text-xs font-600 uppercase tracking-wider">Active Financing</div>
            <div className="text-white font-800 text-2xl mt-2">{formatPHP(Math.round(totalActive))}</div>
            <div className="text-white/60 text-xs mt-1">{activeFinancing.length} accounts</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Collected (All)</div>
            <div className="text-[#10212B] font-800 text-2xl mt-2">{formatPHP(collected)}</div>
          </div>
          <div className={`rounded-2xl p-5 border ${overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Overdue Amount</div>
            <div className={`font-800 text-2xl mt-2 ${overdue > 0 ? 'text-red-600' : 'text-[#10212B]'}`}>{formatPHP(Math.round(overdue))}</div>
          </div>
        </div>

        {/* Secondary Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Orders Today</div>
            <div className="text-[#0D2B45] font-800 text-2xl mt-1">{state.orders.length}</div>
            <button onClick={() => navigate('admin/orders')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline">View →</button>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Customers</div>
            <div className="text-[#0D2B45] font-800 text-2xl mt-1">{state.customers.length}</div>
            <button onClick={() => navigate('admin/customers')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline">View →</button>
          </div>
          <div className={`rounded-2xl p-4 border ${lowStock > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Low / Out of Stock</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{lowStock}</div>
            <button onClick={() => navigate('admin/inventory')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline">View →</button>
          </div>
          <div className={`rounded-2xl p-4 border ${pendingFinancing > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Pending Financing</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{pendingFinancing}</div>
            <button onClick={() => navigate('admin/financing')} className="text-xs text-[#1E7D3B] font-600 mt-1 hover:underline">Review →</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Recent Orders */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-700 text-sm text-[#10212B]">Recent Orders</div>
              <button onClick={() => navigate('admin/orders')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View all →</button>
            </div>
            <div className="space-y-2">
              {recentOrders.map(order => {
                const customer = getCustomer(order.customerId);
                return (
                  <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-[#F7F8F6] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#F7F8F6] rounded-xl flex items-center justify-center text-[11px] font-700 text-[#65727A]">
                        {order.items.length}
                      </div>
                      <div>
                        <div className="text-sm font-600 text-[#10212B]">{order.orderNo}</div>
                        <div className="text-[11px] text-[#65727A]">{customer?.fullName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-700 text-sm text-[#10212B]">{formatPHP(order.total)}</span>
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
