import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';

export function ReportsPage() {
  const { state, formatPHP } = useApp();

  const purchasePayments = state.payments.filter(p => p.status === 'paid' && p.type === 'purchase');
  const installmentPayments = state.payments.filter(p => p.status === 'paid' && p.type === 'installment');
  const settlementPayments = state.payments.filter(p => p.status === 'paid' && p.type === 'full_settlement');

  const totalSales = purchasePayments.reduce((s, p) => s + p.amount, 0);
  const cashSales = purchasePayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
  const gcashSales = purchasePayments.filter(p => p.method === 'gcash').reduce((s, p) => s + p.amount, 0);
  const financedSales = state.financing.reduce((s, f) => s + f.principal, 0);
  const outstanding = state.financing.filter(f => f.status === 'active' || f.status === 'overdue').reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
  const collected = installmentPayments.reduce((s, p) => s + p.amount, 0) + settlementPayments.reduce((s, p) => s + p.amount, 0);
  const overdueAmt = state.financing.filter(f => f.status === 'overdue').reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
  const restockCost = state.restockOrders.filter(r => r.status === 'received').reduce((s, r) => s + r.totalCost, 0);

  const summaryCards = [
    { label: 'Total Sales', value: formatPHP(totalSales), color: 'bg-[#0D2B45] text-white' },
    { label: 'Cash Sales', value: formatPHP(cashSales), color: 'bg-white border border-[#E4E8E6]' },
    { label: 'GCash Sales', value: formatPHP(gcashSales), color: 'bg-white border border-[#E4E8E6]' },
    { label: 'Financed Sales', value: formatPHP(financedSales), color: 'bg-[#1E7D3B] text-white' },
    { label: 'Outstanding Financing', value: formatPHP(Math.round(outstanding)), color: 'bg-white border border-[#E4E8E6]' },
    { label: 'Installments Collected', value: formatPHP(collected), color: 'bg-white border border-[#E4E8E6]' },
    { label: 'Overdue Amount', value: formatPHP(Math.round(overdueAmt)), color: overdueAmt > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-[#E4E8E6]' },
    { label: 'Restock Cost (received)', value: formatPHP(restockCost), color: 'bg-[#FFF8E1] border border-[#FFC107]/30' },
  ];

  // Financing status breakdown
  const finStatuses = ['pending', 'active', 'overdue', 'completed', 'rejected'];
  const finBreakdown = finStatuses.map(s => ({
    status: s,
    count: state.financing.filter(f => f.status === s).length,
    amount: state.financing.filter(f => f.status === s).reduce((acc, f) => acc + f.principal, 0),
  }));

  // Top 5 products by sales volume
  const productSales = state.products.map(p => {
    const sold = state.orders.reduce((s, o) => {
      const item = o.items.find(i => i.productId === p.id);
      return s + (item?.quantity || 0);
    }, 0);
    return { ...p, sold, revenue: sold * p.sellingPrice };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <InternalLayout title="Reports">
      <div className="space-y-6">
        {/* Summary Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(card => (
            <div key={card.label} className={`rounded-2xl p-4 ${card.color}`}>
              <div className={`text-xs font-600 uppercase tracking-wider ${card.color.includes('text-white') ? 'text-white/70' : 'text-[#65727A]'}`}>{card.label}</div>
              <div className={`font-800 text-xl mt-2 ${card.color.includes('text-white') ? 'text-white' : 'text-[#10212B]'}`}>{card.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Financing Status Breakdown */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="font-700 text-sm text-[#10212B] mb-4">Financing Status Breakdown</div>
            <div className="space-y-3">
              {finBreakdown.map(f => (
                <div key={f.status} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-600 text-[#65727A] capitalize">{f.status}</div>
                  <div className="flex-1 bg-[#F7F8F6] rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${f.status === 'active' ? 'bg-[#1E7D3B]' : f.status === 'overdue' ? 'bg-red-500' : f.status === 'completed' ? 'bg-[#7DBE4C]' : f.status === 'pending' ? 'bg-[#FFC107]' : 'bg-[#E4E8E6]'}`}
                      style={{ width: `${state.financing.length > 0 ? (f.count / state.financing.length * 100) : 0}%` }}
                    />
                  </div>
                  <div className="w-8 text-xs font-700 text-[#10212B]">{f.count}</div>
                  <div className="w-24 text-xs font-600 text-[#65727A] text-right">{formatPHP(f.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="font-700 text-sm text-[#10212B] mb-4">Top Products by Revenue</div>
            <div className="space-y-3">
              {productSales.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#0D2B45] rounded-lg flex items-center justify-center text-[10px] font-700 text-white shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-600 text-[#10212B] truncate">{p.name}</div>
                    <div className="text-[11px] text-[#65727A]">{p.sold} units sold</div>
                  </div>
                  <div className="text-sm font-700 text-[#1E7D3B] shrink-0">{formatPHP(p.revenue)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Types */}
          <div className="col-span-12 bg-white rounded-2xl border border-[#E4E8E6] p-5">
            <div className="font-700 text-sm text-[#10212B] mb-4">Payment Type Summary</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Purchase Payments', payments: purchasePayments },
                { label: 'Installment Payments', payments: installmentPayments },
                { label: 'Full Settlements', payments: settlementPayments },
              ].map(({ label, payments }) => {
                const total = payments.reduce((s, p) => s + p.amount, 0);
                const cashAmt = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
                const gcashAmt = payments.filter(p => p.method === 'gcash').reduce((s, p) => s + p.amount, 0);
                return (
                  <div key={label} className="bg-[#F7F8F6] rounded-xl p-4">
                    <div className="text-xs font-600 text-[#65727A] mb-2">{label}</div>
                    <div className="text-2xl font-800 text-[#10212B] mb-2">{formatPHP(total)}</div>
                    <div className="text-xs text-[#65727A]">Cash: {formatPHP(cashAmt)}</div>
                    <div className="text-xs text-[#65727A]">GCash: {formatPHP(gcashAmt)}</div>
                    <div className="text-xs text-[#65727A] mt-1">{payments.length} transactions</div>
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
