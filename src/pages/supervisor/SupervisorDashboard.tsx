import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { OrderStatusBadge, FinancingStatusBadge } from '../../components/ui/Badge';

export function SupervisorDashboard() {
  const { state, dispatch, navigate, getCustomer, showToast, formatPHP } = useApp();

  const pendingFinancing = state.financing.filter(f => f.status === 'pending');
  const activeFinancing = state.financing.filter(f => f.status === 'active');
  const overdueAccounts = state.financing.filter(f => f.status === 'overdue');
  const todayOrders = state.orders.slice(0, 5);
  const lowStock = state.products.filter(p => p.stock <= p.reorderLevel);

  const totalOutstanding = activeFinancing.reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
  const totalOverdue = overdueAccounts.reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);

  const approveFinancing = (finId: string) => {
    dispatch({ type: 'APPROVE_FINANCING', financingId: finId, approvedBy: state.currentUser!.name });
    showToast('success', 'Financing approved! Customer can now proceed.');
  };

  const rejectFinancing = (finId: string) => {
    dispatch({ type: 'REJECT_FINANCING', financingId: finId, rejectedBy: state.currentUser!.name });
    showToast('info', 'Financing rejected.');
  };

  return (
    <InternalLayout title="Supervisor Dashboard">
      <div className="space-y-5">
        {/* Bento KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`rounded-2xl p-5 border ${pendingFinancing.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Pending Financing</div>
            <div className="text-[#10212B] font-800 text-3xl mt-2">{pendingFinancing.length}</div>
            {pendingFinancing.length > 0 && <div className="text-xs text-amber-600 mt-1">Requires review</div>}
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Outstanding</div>
            <div className="text-[#10212B] font-800 text-2xl mt-2">{formatPHP(Math.round(totalOutstanding))}</div>
            <div className="text-xs text-[#65727A] mt-1">{activeFinancing.length} active accounts</div>
          </div>
          <div className={`rounded-2xl p-5 border ${overdueAccounts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E4E8E6]'}`}>
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Overdue</div>
            <div className="text-[#10212B] font-800 text-2xl mt-2">{formatPHP(Math.round(totalOverdue))}</div>
            <div className="text-xs text-red-500 mt-1">{overdueAccounts.length} overdue accounts</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Orders Today</div>
            <div className="text-[#0D2B45] font-800 text-3xl mt-2">{todayOrders.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Financing Approval Queue */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-700 text-sm text-[#10212B]">Financing Approval Queue</div>
              <button onClick={() => navigate('supervisor/financing')} className="text-xs text-[#1E7D3B] font-600 hover:underline">View all →</button>
            </div>
            {pendingFinancing.length === 0 ? (
              <div className="text-center py-8 text-[#65727A] text-sm">No pending financing requests</div>
            ) : (
              <div className="space-y-4">
                {pendingFinancing.map(fin => {
                  const customer = getCustomer(fin.customerId);
                  return (
                    <div key={fin.id} className="border border-[#E4E8E6] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-700 text-sm text-[#10212B]">{fin.financingNo}</div>
                          <div className="text-xs text-[#65727A]">{customer?.fullName} · {customer?.storeName}</div>
                        </div>
                        <FinancingStatusBadge status={fin.status} />
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3 text-xs">
                        <div><div className="text-[#65727A]">Principal</div><div className="font-700 text-[#10212B]">{formatPHP(fin.principal)}</div></div>
                        <div><div className="text-[#65727A]">Charge ({fin.chargePercent}%)</div><div className="font-700 text-[#10212B]">{formatPHP(fin.chargeAmount)}</div></div>
                        <div><div className="text-[#65727A]">Total Repayable</div><div className="font-700 text-[#10212B]">{formatPHP(fin.totalRepayable)}</div></div>
                        <div><div className="text-[#65727A]">Plan</div><div className="font-700 text-[#10212B]">{fin.plan}mo · {fin.installmentCount}×{formatPHP(fin.weeklyInstallment)}</div></div>
                      </div>
                      <div className="text-xs text-[#65727A] mb-3">
                        Customer standing: <span className={`font-600 ${customer?.status === 'active' ? 'text-[#1E7D3B]' : 'text-red-500'}`}>{customer?.status === 'active' ? 'Good Standing' : 'Suspended'}</span>
                        · Available Credit: <span className="font-600 text-[#10212B]">{formatPHP((customer?.creditLimit || 0) - (customer?.usedCredit || 0))}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => rejectFinancing(fin.id)} className="px-4 py-2 border border-red-200 text-red-600 text-sm font-600 rounded-xl hover:bg-red-50 transition-all">Reject</button>
                        <button onClick={() => approveFinancing(fin.id)} className="px-4 py-2 bg-[#1E7D3B] text-white text-sm font-600 rounded-xl hover:bg-[#22913f] transition-all">Approve</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
              <div className="font-700 text-sm text-[#10212B] mb-4">Overdue Accounts</div>
              {overdueAccounts.length === 0 ? (
                <div className="text-center py-4 text-[#65727A] text-sm">No overdue accounts</div>
              ) : (
                <div className="space-y-3">
                  {overdueAccounts.map(fin => {
                    const customer = getCustomer(fin.customerId);
                    const overduePenalty = fin.schedule.filter(s => s.status === 'overdue').reduce((s, i) => s + i.penalty, 0);
                    return (
                      <div key={fin.id} className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <div className="font-600 text-sm text-[#10212B]">{customer?.fullName}</div>
                        <div className="text-xs text-[#65727A]">{fin.financingNo}</div>
                        <div className="text-xs text-red-600 font-600 mt-1">+{formatPHP(overduePenalty)} in penalties</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
              <div className="font-700 text-sm text-[#10212B] mb-4">Low Stock</div>
              {lowStock.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between py-1.5 border-b border-[#F7F8F6] last:border-0 text-sm">
                  <span className="text-[#10212B] text-xs truncate pr-2">{p.name}</span>
                  <span className={`font-700 text-xs shrink-0 ${p.stock === 0 ? 'text-red-500' : 'text-amber-600'}`}>{p.stock} left</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
