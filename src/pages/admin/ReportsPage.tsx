import { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import logo from '../../imports/image-1.png';

export function ReportsPage() {
  const { state, formatPHP, showToast } = useApp();
  const [period, setPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');

  const now = new Date();

  const isWithinPeriod = (dateStr?: string) => {
    if (!dateStr || period === 'all') return true;
    const itemDate = new Date(dateStr);
    if (period === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }
    if (period === 'month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const purchasePayments = state.payments.filter(
    p => p.status === 'paid' && p.type === 'purchase' && isWithinPeriod(p.createdAt)
  );
  const installmentPayments = state.payments.filter(
    p => p.status === 'paid' && p.type === 'installment' && isWithinPeriod(p.createdAt)
  );
  const settlementPayments = state.payments.filter(
    p => p.status === 'paid' && p.type === 'full_settlement' && isWithinPeriod(p.createdAt)
  );

  const filteredOrders = state.orders.filter(o => isWithinPeriod(o.createdAt));
  const filteredFinancing = state.financing.filter(f => isWithinPeriod(f.createdAt));
  const filteredRestock = state.restockOrders.filter(r => isWithinPeriod(r.createdAt));

  const totalSales = purchasePayments.reduce((s, p) => s + p.amount, 0);
  const cashSales = purchasePayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
  const gcashSales = purchasePayments.filter(p => p.method === 'gcash').reduce((s, p) => s + p.amount, 0);
  const financedSales = filteredFinancing.reduce((s, f) => s + f.principal, 0);
  const outstanding = filteredFinancing
    .filter(f => f.status === 'active' || f.status === 'overdue')
    .reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
  const collected = installmentPayments.reduce((s, p) => s + p.amount, 0) + settlementPayments.reduce((s, p) => s + p.amount, 0);
  const overdueAmt = filteredFinancing
    .filter(f => f.status === 'overdue')
    .reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);
  const restockCost = filteredRestock.filter(r => r.status === 'received').reduce((s, r) => s + r.totalCost, 0);

  const summaryCards = [
    {
      label: 'Total Sales',
      value: formatPHP(totalSales),
      sub: `${purchasePayments.length} purchases settled`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-emerald-50 text-[#1E7D3B]',
      border: 'border-[#E4E8E6]',
    },
    {
      label: 'Cash Sales',
      value: formatPHP(cashSales),
      sub: `${totalSales > 0 ? Math.round((cashSales / totalSales) * 100) : 0}% of settled sales`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      iconBg: 'bg-slate-100 text-[#0D2B45]',
      border: 'border-[#E4E8E6]',
    },
    {
      label: 'GCash Sales',
      value: formatPHP(gcashSales),
      sub: `${totalSales > 0 ? Math.round((gcashSales / totalSales) * 100) : 0}% of settled sales`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      iconBg: 'bg-blue-50 text-blue-600',
      border: 'border-[#E4E8E6]',
    },
    {
      label: 'Financed Volume',
      value: formatPHP(financedSales),
      sub: `${filteredFinancing.length} loan applications`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      iconBg: 'bg-emerald-50 text-[#1E7D3B]',
      border: 'border-[#E4E8E6]',
    },
    {
      label: 'Outstanding Financing',
      value: formatPHP(Math.round(outstanding)),
      sub: 'Principal + finance charge due',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      iconBg: 'bg-amber-50 text-amber-700',
      border: 'border-[#E4E8E6]',
    },
    {
      label: 'Installments Collected',
      value: formatPHP(collected),
      sub: `${installmentPayments.length + settlementPayments.length} payments received`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      iconBg: 'bg-emerald-50 text-[#1E7D3B]',
      border: 'border-[#E4E8E6]',
    },
    {
      label: 'Overdue Amount',
      value: formatPHP(Math.round(overdueAmt)),
      sub: overdueAmt > 0 ? 'Requires collection follow-up' : 'All accounts in good standing',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: overdueAmt > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-[#65727A]',
      border: overdueAmt > 0 ? 'border-red-200 bg-red-50/20' : 'border-[#E4E8E6]',
    },
    {
      label: 'Restock Cost (Received)',
      value: formatPHP(restockCost),
      sub: `${filteredRestock.filter(r => r.status === 'received').length} shipments received`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      iconBg: 'bg-amber-50 text-amber-700',
      border: 'border-[#E4E8E6]',
    },
  ];

  // Financing status breakdown
  const finStatuses: { key: string; label: string; bg: string; dot: string }[] = [
    { key: 'active', label: 'Active', bg: 'bg-[#1E7D3B]', dot: 'bg-[#1E7D3B]' },
    { key: 'pending', label: 'Pending', bg: 'bg-amber-500', dot: 'bg-amber-500' },
    { key: 'completed', label: 'Completed', bg: 'bg-blue-600', dot: 'bg-blue-600' },
    { key: 'overdue', label: 'Overdue', bg: 'bg-red-500', dot: 'bg-red-500' },
    { key: 'rejected', label: 'Rejected', bg: 'bg-slate-400', dot: 'bg-slate-400' },
  ];

  const totalFinCount = filteredFinancing.length || 1;
  const finBreakdown = finStatuses.map(s => {
    const list = filteredFinancing.filter(f => f.status === s.key);
    return {
      ...s,
      count: list.length,
      amount: list.reduce((acc, f) => acc + f.principal, 0),
      percent: Math.round((list.length / totalFinCount) * 100),
    };
  });

  // Top products by sales volume in filtered orders
  const productSales = state.products
    .map(p => {
      const sold = filteredOrders.reduce((s, o) => {
        const orderItems = (Array.isArray(o.items) ? o.items : o.items ? Object.values(o.items) : []) as {
          productId: string;
          quantity: number;
        }[];
        const item = orderItems.find(i => i.productId === p.id);
        return s + (item?.quantity || 0);
      }, 0);
      return { ...p, sold, revenue: sold * p.sellingPrice };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const totalProdRev = productSales.reduce((acc, p) => acc + p.revenue, 0) || 1;

  // --- CSV Export Handler ---
  const handleExportCSV = () => {
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const staffName = state.currentUser?.name || 'Administrator';
    const roleName = state.currentUser?.role || 'Admin';

    const escapeCSV = (val: string | number) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows: string[][] = [
      ['SARI-FI FINANCIAL & OPERATIONS REPORT'],
      ['Report Generated Date', dateStr],
      ['Report Generated Time', timeStr],
      ['Generated By', `${staffName} (${roleName})`],
      ['Reporting Period', period.toUpperCase()],
      [],
      ['=== 1. EXECUTIVE SUMMARY METRICS ==='],
      ['Metric', 'Amount (PHP)', 'Notes'],
      ['Total Sales (Purchases Settled)', totalSales.toFixed(2), 'Direct purchases completed'],
      ['Cash Sales', cashSales.toFixed(2), `${totalSales > 0 ? Math.round((cashSales / totalSales) * 100) : 0}% of settled sales`],
      ['GCash Sales', gcashSales.toFixed(2), `${totalSales > 0 ? Math.round((gcashSales / totalSales) * 100) : 0}% of settled sales`],
      ['Financed Volume (Credit Granted)', financedSales.toFixed(2), `${filteredFinancing.length} loan applications`],
      ['Outstanding Financing', outstanding.toFixed(2), 'Principal + finance charges due'],
      ['Installments Collected', collected.toFixed(2), 'Installment and settlement collections'],
      ['Overdue Amount', overdueAmt.toFixed(2), overdueAmt > 0 ? 'Past due installments' : 'No overdue accounts'],
      ['Restock Inventory Cost (Received)', restockCost.toFixed(2), 'Received wholesale shipments'],
      [],
      ['=== 2. FINANCING PORTFOLIO BREAKDOWN ==='],
      ['Status', 'Account Count', 'Total Principal (PHP)', 'Share (%)'],
      ...finBreakdown.map(f => [f.label, String(f.count), f.amount.toFixed(2), `${f.percent}%`]),
      [],
      ['=== 3. TOP PRODUCTS BY REVENUE ==='],
      ['Rank', 'Product Name', 'Category', 'Units Sold', 'Total Revenue (PHP)'],
      ...productSales.map((p, i) => [
        String(i + 1),
        p.name,
        p.category || 'General',
        String(p.sold),
        p.revenue.toFixed(2),
      ]),
      [],
      ['=== 4. PAYMENT TYPE SETTLEMENT BREAKDOWN ==='],
      ['Payment Type', 'Total Volume (PHP)', 'Cash Amount (PHP)', 'GCash Amount (PHP)', 'Transaction Count'],
      [
        'Purchase Payments',
        purchasePayments.reduce((s, p) => s + p.amount, 0).toFixed(2),
        purchasePayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0).toFixed(2),
        purchasePayments.filter(p => p.method === 'gcash').reduce((s, p) => s + p.amount, 0).toFixed(2),
        String(purchasePayments.length),
      ],
      [
        'Installment Payments',
        installmentPayments.reduce((s, p) => s + p.amount, 0).toFixed(2),
        installmentPayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0).toFixed(2),
        installmentPayments.filter(p => p.method === 'gcash').reduce((s, p) => s + p.amount, 0).toFixed(2),
        String(installmentPayments.length),
      ],
      [
        'Full Settlements',
        settlementPayments.reduce((s, p) => s + p.amount, 0).toFixed(2),
        settlementPayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0).toFixed(2),
        settlementPayments.filter(p => p.method === 'gcash').reduce((s, p) => s + p.amount, 0).toFixed(2),
        String(settlementPayments.length),
      ],
    ];

    const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SariFi_Financial_Report_${dateStr}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', 'Financial report CSV exported successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <InternalLayout title="Reports & Financial Oversight">
      <div className="space-y-6 pb-8">
        {/* Printable Official Statement Header (Visible only when printing/saving PDF) */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-[#0D2B45]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sari-Fi" className="h-8 object-contain" />
              <div>
                <h1 className="text-xl font-800 text-[#0D2B45]">SARI-FI FINANCIAL & OPERATIONS REPORT</h1>
                <p className="text-xs text-[#65727A]">Middleman Wholesale & Micro-Financing Platform</p>
              </div>
            </div>
            <div className="text-right text-xs text-[#65727A]">
              <div><strong className="text-[#10212B]">Date:</strong> {now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div><strong className="text-[#10212B]">Generated By:</strong> {state.currentUser?.name} ({state.currentUser?.role})</div>
              <div><strong className="text-[#10212B]">Scope:</strong> {period.toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* Action & Filter Toolbar (Screen Only) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E4E8E6] shadow-xs">
          {/* Period Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#F7F8F6] p-1 rounded-xl border border-[#E4E8E6]">
            {[
              { key: 'all', label: 'All Time' },
              { key: 'month', label: 'This Month' },
              { key: 'week', label: 'This Week' },
              { key: 'today', label: 'Today' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPeriod(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-700 transition-all cursor-pointer ${
                  period === tab.key
                    ? 'bg-[#0D2B45] text-white shadow-xs'
                    : 'text-[#65727A] hover:text-[#0D2B45] hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportCSV}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E7D3B] hover:bg-[#22913f] text-white text-xs font-700 rounded-xl transition-all shadow-sm shadow-[#1E7D3B]/20 cursor-pointer"
              title="Download structured CSV file for Excel or Google Sheets"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePrint}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F7F8F6] text-[#0D2B45] border border-[#E4E8E6] text-xs font-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Print report or save as PDF document"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / PDF</span>
            </motion.button>
          </div>
        </div>

        {/* Uniform Bento KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {summaryCards.map(card => (
            <motion.div
              key={card.label}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`bg-white rounded-2xl border ${card.border} p-4 sm:p-5 shadow-xs flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-700 uppercase tracking-wider text-[#65727A] truncate">
                  {card.label}
                </span>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  {card.icon}
                </span>
              </div>
              <div>
                <div className="font-800 text-xl sm:text-2xl text-[#10212B] tracking-tight tnum truncate">
                  {card.value}
                </div>
                <div className="text-[11px] text-[#65727A] mt-1 truncate">
                  {card.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Middle Two-Column Grid */}
        <div className="grid grid-cols-12 gap-5">
          {/* Financing Status Breakdown */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-700 text-sm sm:text-base text-[#10212B]">Financing Status Distribution</h3>
                <p className="text-xs text-[#65727A] mt-0.5">Live status of customer credit borrowing lines</p>
              </div>
              <span className="text-xs font-700 text-[#0D2B45] bg-[#F7F8F6] border border-[#E4E8E6] px-2.5 py-1 rounded-lg">
                {filteredFinancing.length} Total Accounts
              </span>
            </div>

            {/* Segmented Stacked Bar */}
            <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[#F7F8F6] p-0.5 border border-[#E4E8E6] mb-5">
              {finBreakdown.map(f =>
                f.percent > 0 ? (
                  <div
                    key={f.key}
                    style={{ width: `${f.percent}%` }}
                    className={`${f.bg} h-full first:rounded-l-full last:rounded-r-full transition-all`}
                    title={`${f.label}: ${f.count} accounts (${f.percent}%)`}
                  />
                ) : null
              )}
            </div>

            {/* Breakdown Rows */}
            <div className="space-y-3">
              {finBreakdown.map(f => (
                <div key={f.key} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F8F6] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${f.dot}`} />
                    <span className="text-xs font-700 text-[#10212B]">{f.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#65727A] font-600 tnum">{f.count} accounts ({f.percent}%)</span>
                    <span className="font-800 text-[#0D2B45] tnum w-24 text-right">{formatPHP(f.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products Leaderboard */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-700 text-sm sm:text-base text-[#10212B]">Top Products by Revenue</h3>
                <p className="text-xs text-[#65727A] mt-0.5">Top performing inventory lines in period</p>
              </div>
              <span className="text-xs font-700 text-[#1E7D3B] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Catalog Top 5
              </span>
            </div>

            <div className="space-y-3">
              {productSales.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#65727A]">No product sales recorded in this period.</div>
              ) : (
                productSales.map((p, i) => {
                  const sharePct = Math.round((p.revenue / totalProdRev) * 100);
                  const rankColors = [
                    'bg-amber-100 text-amber-800 border-amber-300',
                    'bg-slate-100 text-slate-700 border-slate-300',
                    'bg-orange-100 text-orange-800 border-orange-300',
                    'bg-slate-50 text-slate-600 border-slate-200',
                    'bg-slate-50 text-slate-600 border-slate-200',
                  ];
                  return (
                    <div key={p.id} className="p-3 rounded-xl border border-[#E4E8E6] hover:border-[#1E7D3B]/40 transition-all bg-white">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-md border text-[10px] font-800 flex items-center justify-center shrink-0 ${rankColors[i]}`}>
                            {i + 1}
                          </span>
                          <span className="text-xs font-700 text-[#10212B] truncate">{p.name}</span>
                          {p.category && (
                            <span className="text-[10px] font-600 text-[#65727A] bg-[#F7F8F6] px-2 py-0.5 rounded-md border border-[#E4E8E6] hidden sm:inline">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-800 text-[#1E7D3B] shrink-0 tnum">
                          {formatPHP(p.revenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#65727A] gap-3">
                        <div className="flex-1 bg-[#F7F8F6] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#1E7D3B] h-full rounded-full" style={{ width: `${sharePct}%` }} />
                        </div>
                        <span className="shrink-0 tnum">{p.sold} units sold · {sharePct}% share</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment Type Summary */}
          <div className="col-span-12 bg-white rounded-2xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-700 text-sm sm:text-base text-[#10212B]">Payment Type Settlement Breakdown</h3>
                <p className="text-xs text-[#65727A] mt-0.5">Comparative performance across payment channels</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: 'Purchase Payments',
                  description: 'Direct POS and online store orders',
                  payments: purchasePayments,
                  tag: 'Storefront',
                  accent: 'bg-[#1E7D3B]',
                },
                {
                  label: 'Installment Payments',
                  description: 'Scheduled weekly financing payments',
                  payments: installmentPayments,
                  tag: 'Repayments',
                  accent: 'bg-[#0D2B45]',
                },
                {
                  label: 'Full Settlements',
                  description: 'Early or lump-sum loan balance payoffs',
                  payments: settlementPayments,
                  tag: 'Payoffs',
                  accent: 'bg-[#7DBE4C]',
                },
              ].map(({ label, description, payments, tag, accent }) => {
                const total = payments.reduce((s, p) => s + p.amount, 0);
                const cashAmt = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
                const gcashAmt = payments.filter(p => p.method === 'gcash').reduce((s, p) => s + p.amount, 0);
                const cashPct = total > 0 ? Math.round((cashAmt / total) * 100) : 0;
                const gcashPct = total > 0 ? 100 - cashPct : 0;

                return (
                  <div key={label} className="bg-[#F7F8F6] rounded-2xl p-4 sm:p-5 border border-[#E4E8E6] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-700 text-[#10212B] truncate">{label}</span>
                        <span className="text-[10px] font-700 uppercase tracking-wider text-[#65727A] bg-white px-2 py-0.5 rounded-md border border-[#E4E8E6]">
                          {tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#65727A] mb-4">{description}</p>
                      <div className="text-2xl font-800 text-[#10212B] tracking-tight tnum mb-3">
                        {formatPHP(total)}
                      </div>

                      {/* Cash vs GCash Bar */}
                      <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#E4E8E6] mb-3">
                        {cashPct > 0 && <div style={{ width: `${cashPct}%` }} className="bg-[#0D2B45] h-full" title={`Cash: ${cashPct}%`} />}
                        {gcashPct > 0 && <div style={{ width: `${gcashPct}%` }} className="bg-[#7DBE4C] h-full" title={`GCash: ${gcashPct}%`} />}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[#65727A]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#0D2B45]" />
                            Cash:
                          </span>
                          <span className="font-700 text-[#10212B] tnum">{formatPHP(cashAmt)} ({cashPct}%)</span>
                        </div>
                        <div className="flex justify-between text-[#65727A]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#7DBE4C]" />
                            GCash:
                          </span>
                          <span className="font-700 text-[#10212B] tnum">{formatPHP(gcashAmt)} ({gcashPct}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#E4E8E6] flex items-center justify-between text-[11px] text-[#65727A]">
                      <span>Volume:</span>
                      <span className="font-700 text-[#0D2B45]">{payments.length} transactions</span>
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
