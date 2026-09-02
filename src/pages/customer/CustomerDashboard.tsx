import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { OrderStatusBadge, FinancingStatusBadge } from '../../components/ui/Badge';

export function CustomerDashboard() {
  const { state, navigate, getCurrentCustomer, getCustomerFinancing, getCustomerOrders, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  const financing = getCustomerFinancing(customer?.id || '');
  const orders = getCustomerOrders(customer?.id || '');

  if (!customer) return null;

  const available = customer.creditLimit - customer.usedCredit;
  const availablePercent = Math.round((available / customer.creditLimit) * 100);
  const activeFinancing = financing.filter(f => f.status === 'active' || f.status === 'overdue');
  const pendingFinancing = financing.filter(f => f.status === 'pending');
  const totalOutstanding = activeFinancing.reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));

  // Next payment across all active financing
  const nextDue = activeFinancing.flatMap(f => f.schedule.filter(s => s.status === 'due' || s.status === 'upcoming'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  const recentPayments = state.payments.filter(p => p.customerId === customer.id).slice(0, 5);

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-4 stagger">

          {/* Welcome Card — col 8 */}
          <div className="col-span-12 md:col-span-8 bg-gradient-to-br from-[#0D2B45] to-[#0a2237] rounded-2xl p-6 relative overflow-hidden lit-top">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#1E7D3B]/20 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="relative">
              <div className="text-white/60 text-sm mb-1">Welcome back,</div>
              <div className="text-white font-800 text-2xl mb-0.5">{customer.fullName}</div>
              <div className="text-[#7DBE4C] text-sm font-500 mb-4">{customer.storeName}</div>
              <div className="flex items-center gap-3">
                <div className="text-white/50 text-xs">Account</div>
                <div className="text-white font-700 text-xs">{customer.accountNo}</div>
              </div>
              <button
                onClick={() => navigate('customer/shop')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1E7D3B] hover:bg-[#22913f] text-white text-sm font-600 rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Shop Inventory
              </button>
            </div>
          </div>

          {/* Available Credit — col 4 */}
          <div className="col-span-12 md:col-span-4 bg-gradient-to-br from-[#22913f] to-[#1E7D3B] rounded-2xl p-5 flex flex-col lit-top relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
            <div className="text-white/70 text-xs font-600 uppercase tracking-wider">Available Credit</div>
            <div className="mt-2 text-white font-800 text-3xl">{formatPHP(available)}</div>
            <div className="text-white/60 text-xs mt-1">of {formatPHP(customer.creditLimit)} limit</div>
            <div className="mt-4 bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${availablePercent}%` }} />
            </div>
            <div className="text-white/70 text-xs mt-1">{availablePercent}% available</div>
          </div>

          {/* Credit Limit */}
          <div className="card-lift col-span-6 md:col-span-4 bg-white rounded-2xl p-5 border border-[#E4E8E6] shadow-soft-sm">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Credit Limit</div>
            <div className="mt-2 text-[#0D2B45] font-800 text-2xl">{formatPHP(customer.creditLimit)}</div>
            <div className="flex items-center gap-1 mt-2">
              <svg className="w-3.5 h-3.5 text-[#7DBE4C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <span className="text-[11px] text-[#7DBE4C] font-600">+₱1,000 after next cycle</span>
            </div>
          </div>

          {/* Outstanding */}
          <div className="card-lift col-span-6 md:col-span-4 bg-white rounded-2xl p-5 border border-[#E4E8E6] shadow-soft-sm">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Outstanding</div>
            <div className="mt-2 text-[#10212B] font-800 text-2xl">{formatPHP(totalOutstanding)}</div>
            <div className="text-[#65727A] text-xs mt-1">Total repayable remaining</div>
          </div>

          {/* Next Payment */}
          <div className={`col-span-12 md:col-span-4 rounded-2xl p-5 border ${nextDue ? 'bg-[#FFF8E1] border-[#FFC107]/30' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Next Payment</div>
            {nextDue ? (
              <>
                <div className="mt-2 text-[#10212B] font-800 text-2xl">{formatPHP(nextDue.baseAmount + nextDue.penalty)}</div>
                <div className="text-[#65727A] text-xs mt-1">Due {new Date(nextDue.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>
                <button
                  onClick={() => navigate('customer/financing')}
                  className="mt-3 text-xs font-600 text-[#1E7D3B] hover:underline"
                >
                  Pay now →
                </button>
              </>
            ) : (
              <>
                <div className="mt-2 text-[#65727A] font-600 text-lg">No payments due</div>
                <div className="text-[#65727A] text-xs mt-1">You're all caught up!</div>
              </>
            )}
          </div>

          {/* Active Financing */}
          {activeFinancing.length > 0 && (
            <div className="col-span-12 md:col-span-7 bg-white rounded-2xl p-5 border border-[#E4E8E6]">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Active Financing</div>
                <button onClick={() => navigate('customer/financing')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View all →</button>
              </div>
              {activeFinancing.slice(0, 2).map(fin => {
                const paidInstallments = fin.schedule.filter(s => s.status === 'paid').length;
                const progress = paidInstallments / fin.installmentCount;
                const remaining = fin.totalRepayable - (fin.paidPrincipal / fin.principal * fin.totalRepayable);
                return (
                  <div key={fin.id} className="mb-4 last:mb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-700 text-sm text-[#10212B]">{fin.financingNo}</div>
                        <div className="text-[#65727A] text-xs">{fin.plan}-Month Plan · {formatPHP(fin.weeklyInstallment)}/week</div>
                      </div>
                      <FinancingStatusBadge status={fin.status} />
                    </div>
                    <div className="flex gap-4 text-xs mb-2">
                      <div><span className="text-[#65727A]">Principal:</span> <span className="font-600">{formatPHP(fin.principal)}</span></div>
                      <div><span className="text-[#65727A]">Remaining:</span> <span className="font-600 text-[#10212B]">{formatPHP(Math.round(remaining))}</span></div>
                    </div>
                    <div className="bg-[#F7F8F6] rounded-full h-2">
                      <div className="bg-[#7DBE4C] h-2 rounded-full" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <div className="text-[#65727A] text-xs mt-1">{paidInstallments} of {fin.installmentCount} installments paid</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Orders */}
          <div className={`col-span-12 ${activeFinancing.length > 0 ? 'md:col-span-5' : 'md:col-span-12'} bg-white rounded-2xl p-5 border border-[#E4E8E6]`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Active Orders</div>
              <button onClick={() => navigate('customer/orders')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View all →</button>
            </div>
            {activeOrders.length > 0 ? (
              <div className="space-y-3">
                {activeOrders.slice(0, 3).map(order => {
                  const orderItems = Array.isArray(order.items) ? order.items : order.items ? Object.values(order.items) : [];
                  return (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-[#F7F8F6] last:border-0">
                      <div>
                        <div className="font-600 text-sm text-[#10212B]">{order.orderNo}</div>
                        <div className="text-[#65727A] text-xs">{orderItems.length} item{orderItems.length !== 1 ? 's' : ''} · {formatPHP(order.total)}</div>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-[#65727A] text-sm">No active orders</div>
                <button onClick={() => navigate('customer/shop')} className="mt-2 text-xs text-[#1E7D3B] font-600 hover:underline">Start shopping →</button>
              </div>
            )}
          </div>

          {/* Pending financing notice */}
          {pendingFinancing.length > 0 && (
            <div className="col-span-12 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="font-600 text-sm text-amber-800">Financing Awaiting Approval</div>
                <div className="text-amber-700 text-xs">{pendingFinancing[0].financingNo} — {formatPHP(pendingFinancing[0].principal)} — Pending Supervisor review</div>
              </div>
            </div>
          )}

          {/* Recent Payments */}
          {recentPayments.length > 0 && (
            <div className="col-span-12 bg-white rounded-2xl p-5 border border-[#E4E8E6]">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Recent Activity</div>
                <button onClick={() => navigate('customer/payments')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View all →</button>
              </div>
              <div className="space-y-2">
                {recentPayments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between py-2 border-b border-[#F7F8F6] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${pay.method === 'gcash' ? 'bg-blue-50 text-blue-600' : 'bg-[#F7F8F6] text-[#65727A]'}`}>
                        {pay.method === 'gcash' ? 'G' : '₱'}
                      </div>
                      <div>
                        <div className="text-sm font-500 text-[#10212B]">{pay.type === 'installment' ? 'Installment Payment' : pay.type === 'full_settlement' ? 'Full Settlement' : 'Purchase Payment'}</div>
                        <div className="text-xs text-[#65727A]">{new Date(pay.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>
                      </div>
                    </div>
                    <div className={`font-700 text-sm ${pay.status === 'paid' ? 'text-[#1E7D3B]' : 'text-amber-600'}`}>
                      {pay.status === 'paid' ? '-' : ''}{formatPHP(pay.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
