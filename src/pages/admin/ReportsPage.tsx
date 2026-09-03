import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import logo from '../../imports/image-1.png';

type Period = 'all' | 'month' | 'week' | 'today';
type ReportView = 'overview' | 'portfolio' | 'operations';
type Bounds = { start: Date; end: Date } | null;

const PALETTE = {
  navy: '#0D2B45',
  green: '#1E7D3B',
  lime: '#7DBE4C',
  amber: '#F4B740',
  red: '#DC4C4C',
  blue: '#3285C6',
  gray: '#AAB5BA',
};

const panelReveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function getBounds(period: Period, now: Date, previous = false): Bounds {
  if (period === 'all') return null;
  if (period === 'today') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(currentStart);
    start.setDate(start.getDate() + (previous ? -1 : 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === 'week') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const start = new Date(currentStart);
    start.setDate(start.getDate() + (previous ? -7 : 0));
    const end = new Date(currentStart);
    end.setDate(end.getDate() + (previous ? 0 : 7));
    return { start, end };
  }
  const start = previous
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = previous
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function inBounds(value: string | undefined, bounds: Bounds): boolean {
  if (!value) return false;
  if (!bounds) return true;
  const date = new Date(value);
  return date >= bounds.start && date < bounds.end;
}

function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    revenue: <><path d="M4 17l5-5 4 4 7-9" /><path d="M14 7h6v6" /></>,
    wallet: <><path d="M3.5 7.5h15A2.5 2.5 0 0121 10v7a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 011 17V7a3 3 0 013-3h13" /><path d="M16 12h5v4h-5a2 2 0 010-4z" /></>,
    credit: <><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4z" /><path d="M8.5 12l2.2 2.2 4.8-5" /></>,
    receivable: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    order: <><path d="M6 3h12l2 5-8 3-8-3 2-5z" /><path d="M4 8v10l8 3 8-3V8M12 11v10" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0112 0M16 5a3 3 0 010 6M17 14a5 5 0 014 5" /></>,
    inventory: <><path d="M4 7l8-4 8 4-8 4-8-4z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    alert: <><path d="M12 3L2.5 20h19L12 3z" /><path d="M12 9v5m0 3h.01" /></>,
    check: <path d="M5 12.5l4 4L19 7" />,
    download: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />,
    print: <><path d="M6 9V3h12v6M6 17H4a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2" /><path d="M6 14h12v7H6z" /></>,
    arrow: <path d="M5 12h14m-5-5l5 5-5 5" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    trend: <><path d="M3 18l6-6 4 4 8-10" /><path d="M15 6h6v6" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.trend}
    </svg>
  );
}

function AnimatedValue({ value, format }: { value: number; format: (value: number) => string }) {
  const reducedMotion = useReducedMotion();
  const raw = useMotionValue(reducedMotion ? value : 0);
  const spring = useSpring(raw, { stiffness: 95, damping: 24, mass: 0.7 });
  const [display, setDisplay] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    raw.set(value);
    if (reducedMotion) setDisplay(value);
  }, [raw, reducedMotion, value]);
  useMotionValueEvent(spring, 'change', latest => setDisplay(latest));

  return <>{format(display)}</>;
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      variants={panelReveal}
      initial={reducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-[22px] border border-[#DFE6E2] bg-white shadow-[0_1px_2px_rgba(13,43,69,.03),0_12px_32px_rgba(13,43,69,.055)] ${className}`}
    >
      {children}
    </motion.section>
  );
}

function PanelHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <div className="text-[10px] font-800 uppercase tracking-[0.18em] text-[#1E7D3B] mb-1.5">{eyebrow}</div>
        <h3 className="text-[15px] sm:text-base font-800 text-[#10212B] tracking-[-0.02em]">{title}</h3>
        <p className="text-[11px] sm:text-xs text-[#65727A] mt-1 leading-relaxed">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  const reducedMotion = useReducedMotion();
  const width = 680;
  const height = 190;
  const max = Math.max(...data.map(point => point.value), 1);
  const points = data.map((point, index) => ({
    ...point,
    x: 18 + index * ((width - 36) / Math.max(data.length - 1, 1)),
    y: height - 24 - (point.value / max) * (height - 48),
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points.at(-1)?.x || width - 18} ${height - 16} L ${points[0]?.x || 18} ${height - 16} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[190px] overflow-visible" role="img" aria-label="Seven-day recognized order volume">
        <defs>
          <linearGradient id="report-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.green} stopOpacity="0.2" />
            <stop offset="100%" stopColor={PALETTE.green} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(value => (
          <line key={value} x1="18" x2={width - 18} y1={height * value} y2={height * value} stroke="#E8ECE9" strokeDasharray="4 6" />
        ))}
        <motion.path d={area} fill="url(#report-area)" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path
          d={line}
          fill="none"
          stroke={PALETTE.green}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reducedMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
        />
        {points.map((point, index) => (
          <motion.g key={point.label} initial={reducedMotion ? false : { opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + index * 0.07, type: 'spring', stiffness: 280, damping: 18 }}>
            <circle cx={point.x} cy={point.y} r="6" fill="white" stroke={PALETTE.green} strokeWidth="3" />
          </motion.g>
        ))}
      </svg>
      <div className="grid grid-cols-7 mt-1">
        {data.map(point => <div key={point.label} className="text-center text-[9px] sm:text-[10px] text-[#7B898F]">{point.label}</div>)}
      </div>
    </div>
  );
}

function DonutGauge({ value, label }: { value: number; label: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="48" fill="none" stroke="#EDF0EE" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke={value >= 80 ? PALETTE.green : value >= 60 ? PALETTE.amber : PALETTE.red}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          initial={reducedMotion ? false : { strokeDashoffset: 1 }}
          animate={{ strokeDashoffset: 1 - Math.max(0, Math.min(100, value)) / 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-800 tracking-[-0.05em] text-[#0D2B45] tnum">{value}%</div>
        <div className="text-[10px] text-[#65727A] mt-0.5 max-w-[80px] leading-tight">{label}</div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-40 rounded-2xl border border-dashed border-[#D9E1DD] bg-[#FAFBFA] flex flex-col items-center justify-center text-center px-6">
      <span className="w-9 h-9 rounded-xl bg-white border border-[#E4E8E6] text-[#7B898F] flex items-center justify-center mb-3"><Icon name="trend" className="w-4 h-4" /></span>
      <p className="text-xs font-600 text-[#65727A]">{message}</p>
    </div>
  );
}

export function ReportsPage() {
  const { state, formatPHP, showToast, navigate } = useApp();
  const [period, setPeriod] = useState<Period>('month');
  const [activeView, setActiveView] = useState<ReportView>('overview');
  const reducedMotion = useReducedMotion();
  const now = useMemo(() => new Date(), []);
  const bounds = getBounds(period, now);
  const previousBounds = getBounds(period, now, true);

  const report = useMemo(() => {
    const isFinanciallyCleared = (status: string) => !['pending_payment', 'pending_financing', 'cancelled'].includes(status);
    const currentOrders = state.orders.filter(order => inBounds(order.createdAt, bounds));
    const previousOrders = previousBounds ? state.orders.filter(order => inBounds(order.createdAt, previousBounds)) : [];
    const recognizedOrders = currentOrders.filter(order => isFinanciallyCleared(order.status));
    const previousRecognizedOrders = previousOrders.filter(order => isFinanciallyCleared(order.status));

    const settledPayments = state.payments.filter(payment => payment.status === 'paid' && inBounds(payment.paidAt || payment.createdAt, bounds));
    const previousSettledPayments = previousBounds
      ? state.payments.filter(payment => payment.status === 'paid' && inBounds(payment.paidAt || payment.createdAt, previousBounds))
      : [];
    const purchasePayments = settledPayments.filter(payment => payment.type === 'purchase');
    const repaymentPayments = settledPayments.filter(payment => payment.type === 'installment' || payment.type === 'full_settlement');

    const currentFinancing = state.financing.filter(financing => inBounds(financing.createdAt, bounds));
    const approvedFinancing = state.financing.filter(financing =>
      ['active', 'overdue', 'completed', 'approved'].includes(financing.status) &&
      inBounds(financing.approvedAt || financing.createdAt, bounds)
    );
    const activePortfolio = currentFinancing.filter(financing => financing.status === 'active' || financing.status === 'overdue');
    const grossVolume = recognizedOrders.reduce((sum, order) => sum + order.total, 0);
    const previousGrossVolume = previousRecognizedOrders.reduce((sum, order) => sum + order.total, 0);
    const cashCollected = settledPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const previousCashCollected = previousSettledPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const financedVolume = approvedFinancing.reduce((sum, financing) => sum + financing.principal, 0);
    const outstanding = activePortfolio.reduce((sum, financing) => {
      const repaidRatio = financing.principal > 0 ? financing.paidPrincipal / financing.principal : 0;
      return sum + Math.max(0, financing.totalRepayable * (1 - repaidRatio));
    }, 0);
    const overdueBalance = activePortfolio.filter(financing => financing.status === 'overdue').reduce((sum, financing) => {
      const repaidRatio = financing.principal > 0 ? financing.paidPrincipal / financing.principal : 0;
      return sum + Math.max(0, financing.totalRepayable * (1 - repaidRatio));
    }, 0);
    const repaymentCollected = repaymentPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const collectionRate = Math.round((repaymentCollected / Math.max(repaymentCollected + overdueBalance, 1)) * 100);
    const decidedFinancing = currentFinancing.filter(financing => financing.status !== 'pending');
    const approvedDecisions = decidedFinancing.filter(financing => financing.status !== 'rejected').length;
    const approvalRate = Math.round((approvedDecisions / Math.max(decidedFinancing.length, 1)) * 100);
    const completedOrders = currentOrders.filter(order => order.status === 'completed').length;
    const completionRate = Math.round((completedOrders / Math.max(currentOrders.filter(order => order.status !== 'cancelled').length, 1)) * 100);
    const averageOrder = grossVolume / Math.max(recognizedOrders.length, 1);

    const inventoryCost = state.products.reduce((sum, product) => sum + product.stock * product.costPrice, 0);
    const inventoryRetail = state.products.reduce((sum, product) => sum + product.stock * product.sellingPrice, 0);
    const lowStockProducts = state.products.filter(product => product.stock > 0 && product.stock <= product.reorderLevel);
    const outOfStockProducts = state.products.filter(product => product.stock <= 0);
    const healthyProducts = state.products.filter(product => product.stock > product.reorderLevel);

    const productMap = new Map<string, { id: string; name: string; category: string; units: number; revenue: number }>();
    recognizedOrders.forEach(order => order.items.forEach(item => {
      const product = state.products.find(candidate => candidate.id === item.productId);
      const current = productMap.get(item.productId) || { id: item.productId, name: item.productName, category: product?.category || 'General', units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += item.quantity * item.price;
      productMap.set(item.productId, current);
    }));
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

    const customerMap = new Map<string, { id: string; name: string; store: string; orders: number; value: number }>();
    recognizedOrders.forEach(order => {
      const customer = state.customers.find(candidate => candidate.id === order.customerId);
      const current = customerMap.get(order.customerId) || { id: order.customerId, name: customer?.fullName || 'Unknown customer', store: customer?.storeName || 'Unregistered store', orders: 0, value: 0 };
      current.orders += 1;
      current.value += order.total;
      customerMap.set(order.customerId, current);
    });
    const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.value - a.value).slice(0, 6);

    const productSupplier = new Map(state.products.map(product => [product.id, product.supplierId]));
    const supplierScores = state.suppliers.map(supplier => {
      let revenue = 0;
      let orders = 0;
      recognizedOrders.forEach(order => {
        const supplierItems = order.items.filter(item => (item.supplierId || productSupplier.get(item.productId)) === supplier.id);
        if (supplierItems.length) {
          orders += 1;
          revenue += supplierItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
        }
      });
      const supplierProducts = state.products.filter(product => product.supplierId === supplier.id);
      const activeJobs = state.orders.filter(order => ['processing', 'ready', 'out_for_delivery'].includes(order.status) && order.items.some(item => (item.supplierId || productSupplier.get(item.productId)) === supplier.id)).length;
      return { id: supplier.id, name: supplier.name, revenue, orders, products: supplierProducts.length, lowStock: supplierProducts.filter(product => product.stock <= product.reorderLevel).length, activeJobs };
    }).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders).slice(0, 6);

    const funnel = [
      { key: 'pending_payment', label: 'Awaiting payment', color: PALETTE.amber },
      { key: 'pending_financing', label: 'Credit review', color: '#E6923A' },
      { key: 'approved', label: 'Approved', color: '#5B9DCE' },
      { key: 'processing', label: 'Processing', color: PALETTE.navy },
      { key: 'ready', label: 'Ready', color: PALETTE.lime },
      { key: 'out_for_delivery', label: 'In transit', color: PALETTE.blue },
      { key: 'delivered', label: 'Delivered', color: '#46A179' },
      { key: 'completed', label: 'Completed', color: PALETTE.green },
      { key: 'cancelled', label: 'Cancelled', color: PALETTE.red },
    ].map(stage => ({ ...stage, count: currentOrders.filter(order => order.status === stage.key).length }));

    const financeBreakdown = [
      { key: 'pending', label: 'Pending', color: PALETTE.amber },
      { key: 'approved', label: 'Approved', color: '#5B9DCE' },
      { key: 'active', label: 'Active', color: PALETTE.green },
      { key: 'overdue', label: 'Overdue', color: PALETTE.red },
      { key: 'completed', label: 'Completed', color: PALETTE.blue },
      { key: 'rejected', label: 'Rejected', color: PALETTE.gray },
    ].map(stage => ({ ...stage, count: currentFinancing.filter(financing => financing.status === stage.key).length, amount: currentFinancing.filter(financing => financing.status === stage.key).reduce((sum, financing) => sum + financing.principal, 0) }));

    const allSchedules = currentFinancing.flatMap(financing => financing.schedule || []);
    const scheduleHealth = ['paid', 'due', 'overdue', 'upcoming'].map(status => ({ status, count: allSchedules.filter(item => item.status === status).length }));
    const customerExposure = state.customers.map(customer => {
      const loans = currentFinancing.filter(financing => financing.customerId === customer.id && ['active', 'overdue'].includes(financing.status));
      return { id: customer.id, name: customer.fullName, store: customer.storeName, used: customer.usedCredit, limit: customer.creditLimit, overdue: loans.some(loan => loan.status === 'overdue'), loans: loans.length };
    }).filter(customer => customer.used > 0 || customer.loans > 0).sort((a, b) => b.used - a.used).slice(0, 6);

    const daySeries = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      return {
        label: date.toLocaleDateString('en-PH', { weekday: 'short' }).slice(0, 2),
        value: state.orders.filter(order => isFinanciallyCleared(order.status) && new Date(order.createdAt) >= date && new Date(order.createdAt) < next).reduce((sum, order) => sum + order.total, 0),
      };
    });

    const agedPending = state.payments.filter(payment => payment.type === 'purchase' && payment.status === 'pending' && now.getTime() - new Date(payment.createdAt).getTime() > 24 * 60 * 60 * 1000);
    const failedPayments = state.payments.filter(payment => payment.status === 'failed');
    const overdueLoans = state.financing.filter(financing => financing.status === 'overdue');
    const stalledDeliveries = state.orders.filter(order => order.status === 'out_for_delivery' && now.getTime() - new Date(order.updatedAt).getTime() > 48 * 60 * 60 * 1000);
    const alerts = [
      agedPending.length ? { title: 'Payments awaiting action', detail: `${agedPending.length} purchase payment${agedPending.length === 1 ? '' : 's'} pending for over 24 hours`, severity: 'warning', page: 'admin/payments' } : null,
      overdueLoans.length ? { title: 'Overdue credit accounts', detail: `${overdueLoans.length} account${overdueLoans.length === 1 ? '' : 's'} require collection follow-up`, severity: 'critical', page: 'admin/financing' } : null,
      stalledDeliveries.length ? { title: 'Stalled deliveries', detail: `${stalledDeliveries.length} dispatch${stalledDeliveries.length === 1 ? '' : 'es'} in transit for more than 48 hours`, severity: 'warning', page: 'admin/orders' } : null,
      outOfStockProducts.length ? { title: 'Products out of stock', detail: `${outOfStockProducts.length} catalog item${outOfStockProducts.length === 1 ? '' : 's'} cannot be ordered`, severity: 'critical', page: 'admin/orders' } : null,
      failedPayments.length ? { title: 'Failed payment records', detail: `${failedPayments.length} failed transaction${failedPayments.length === 1 ? '' : 's'} retained for reconciliation`, severity: 'neutral', page: 'admin/payments' } : null,
    ].filter(Boolean) as { title: string; detail: string; severity: string; page: string }[];

    return {
      currentOrders,
      recognizedOrders,
      settledPayments,
      purchasePayments,
      repaymentPayments,
      currentFinancing,
      grossVolume,
      cashCollected,
      financedVolume,
      outstanding,
      overdueBalance,
      repaymentCollected,
      collectionRate,
      approvalRate,
      completionRate,
      averageOrder,
      inventoryCost,
      inventoryRetail,
      lowStockProducts,
      outOfStockProducts,
      healthyProducts,
      topProducts,
      topCustomers,
      supplierScores,
      funnel,
      financeBreakdown,
      scheduleHealth,
      customerExposure,
      daySeries,
      alerts,
      grossChange: changePercent(grossVolume, previousGrossVolume),
      cashChange: changePercent(cashCollected, previousCashCollected),
    };
  }, [bounds, now, previousBounds, state]);

  const periodLabel = period === 'all' ? 'All-time' : period === 'month' ? 'This month' : period === 'week' ? 'Last 7 days' : 'Today';
  const compactPHP = (value: number) => formatPHP(Math.round(value));

  const handleExportCSV = () => {
    const escape = (value: string | number) => {
      const string = String(value ?? '');
      return string.includes(',') || string.includes('"') || string.includes('\n') ? `"${string.replace(/"/g, '""')}"` : string;
    };
    const rows: (string | number)[][] = [
      ['SARI-FI EXECUTIVE REPORT'],
      ['Generated', now.toLocaleString('en-PH')],
      ['Generated by', `${state.currentUser?.name || 'Administrator'} (${state.currentUser?.role || 'admin'})`],
      ['Reporting period', periodLabel],
      [],
      ['EXECUTIVE METRICS'],
      ['Recognized order volume', report.grossVolume.toFixed(2)],
      ['Cash collected', report.cashCollected.toFixed(2)],
      ['Activated financing principal', report.financedVolume.toFixed(2)],
      ['Outstanding receivables', report.outstanding.toFixed(2)],
      ['Overdue balance', report.overdueBalance.toFixed(2)],
      ['Collection health', `${report.collectionRate}%`],
      ['Approval rate', `${report.approvalRate}%`],
      ['Order completion rate', `${report.completionRate}%`],
      [],
      ['ORDER LIFECYCLE'],
      ['Stage', 'Orders'],
      ...report.funnel.map(stage => [stage.label, stage.count]),
      [],
      ['FINANCING PORTFOLIO'],
      ['Status', 'Accounts', 'Principal'],
      ...report.financeBreakdown.map(stage => [stage.label, stage.count, stage.amount.toFixed(2)]),
      [],
      ['TOP PRODUCTS'],
      ['Product', 'Category', 'Units', 'Recognized revenue'],
      ...report.topProducts.map(product => [product.name, product.category, product.units, product.revenue.toFixed(2)]),
      [],
      ['TOP CUSTOMERS'],
      ['Customer', 'Store', 'Orders', 'Recognized value'],
      ...report.topCustomers.map(customer => [customer.name, customer.store, customer.orders, customer.value.toFixed(2)]),
      [],
      ['SUPPLIER SCORECARD'],
      ['Supplier', 'Orders', 'Revenue', 'Active jobs', 'Low-stock SKUs'],
      ...report.supplierScores.map(supplier => [supplier.name, supplier.orders, supplier.revenue.toFixed(2), supplier.activeJobs, supplier.lowStock]),
    ];
    const csv = rows.map(row => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `SariFi_Executive_Report_${now.toISOString().split('T')[0]}_${period}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('success', 'Executive report exported with lifecycle, portfolio, and operations data.');
  };

  const kpis = [
    { label: 'Recognized order volume', value: report.grossVolume, format: compactPHP, icon: 'revenue', tone: 'green', note: `${report.recognizedOrders.length} financially cleared orders`, change: report.grossChange },
    { label: 'Cash collected', value: report.cashCollected, format: compactPHP, icon: 'wallet', tone: 'blue', note: `${report.settledPayments.length} settled transactions`, change: report.cashChange },
    { label: 'Credit activated', value: report.financedVolume, format: compactPHP, icon: 'credit', tone: 'lime', note: 'Approved principal in selected period', change: null },
    { label: 'Receivables outstanding', value: report.outstanding, format: compactPHP, icon: 'receivable', tone: report.overdueBalance > 0 ? 'red' : 'amber', note: report.overdueBalance > 0 ? `${compactPHP(report.overdueBalance)} overdue` : 'No overdue balance', change: null },
  ];

  const toneMap: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/10',
    lime: 'bg-lime-50 text-lime-700 ring-lime-600/10',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    red: 'bg-red-50 text-red-700 ring-red-600/10',
  };

  return (
    <InternalLayout title="Reports & Intelligence">
      <div className="pb-10 space-y-5 sm:space-y-6">
        <div className="hidden print:block pb-4 border-b-2 border-[#0D2B45]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sari-Fi" className="h-8 object-contain" />
              <div><h1 className="text-xl font-800 text-[#0D2B45]">SARI-FI EXECUTIVE REPORT</h1><p className="text-xs text-[#65727A]">Financial, credit, and operating intelligence</p></div>
            </div>
            <div className="text-right text-xs text-[#65727A]"><div>{now.toLocaleDateString('en-PH', { dateStyle: 'long' })}</div><div>{periodLabel}</div></div>
          </div>
        </div>

        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[26px] bg-[#0B2941] text-white p-5 sm:p-7 lg:p-8 shadow-[0_22px_60px_rgba(13,43,69,.2)] no-print"
        >
          <motion.div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-[#7DBE4C]/14 blur-3xl" animate={reducedMotion ? {} : { scale: [1, 1.12, 1], opacity: [0.55, 0.85, 0.55] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
          <div className="absolute right-[28%] bottom-[-70%] w-72 h-72 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-7 items-end">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-700 uppercase tracking-[0.14em] text-white/70 mb-5">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7DBE4C] opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#7DBE4C]" /></span>
                Live operating intelligence
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-[38px] leading-[1.08] font-800 tracking-[-0.045em] max-w-2xl">See the business clearly.<br /><span className="text-[#9FD36F]">Act before the numbers become problems.</span></h1>
              <p className="mt-4 text-sm text-white/58 max-w-xl leading-relaxed">A decision-ready view of recognized sales, revolving credit exposure, inventory health, and fulfillment execution.</p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45 font-700">Portfolio health</div>
                <div className="mt-2 text-2xl font-800 tnum">{report.collectionRate}%</div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${report.collectionRate}%` }} transition={{ duration: 1, delay: 0.25 }} className="h-full rounded-full bg-[#7DBE4C]" /></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45 font-700">Action queue</div>
                <div className="mt-2 text-2xl font-800 tnum">{report.alerts.length}</div>
                <div className="mt-1 text-[11px] text-white/50">{report.alerts.length ? 'exceptions need review' : 'all systems clear'}</div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="no-print sticky top-0 z-20 rounded-2xl border border-[#DFE6E2] bg-white/90 backdrop-blur-xl p-2.5 sm:p-3 shadow-[0_10px_30px_rgba(13,43,69,.07)] flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {([
              ['overview', 'Executive overview'],
              ['portfolio', 'Credit portfolio'],
              ['operations', 'Operations'],
            ] as [ReportView, string][]).map(([key, label]) => (
              <button type="button" key={key} aria-pressed={activeView === key} onClick={() => setActiveView(key)} className={`relative shrink-0 cursor-pointer px-3.5 py-2 rounded-xl text-xs font-700 transition-colors ${activeView === key ? 'text-white' : 'text-[#65727A] hover:text-[#0D2B45]'}`}>
                {activeView === key && <motion.span layoutId="report-view-pill" className="absolute inset-0 rounded-xl bg-[#0D2B45] shadow-sm" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-1 bg-[#F5F7F5] p-1 rounded-xl border border-[#E4E8E6] overflow-x-auto">
              {([
                ['all', 'All time'], ['month', 'Month'], ['week', '7 days'], ['today', 'Today'],
              ] as [Period, string][]).map(([key, label]) => (
                <button type="button" key={key} aria-pressed={period === key} onClick={() => setPeriod(key)} className={`relative shrink-0 cursor-pointer px-3 py-1.5 rounded-lg text-[11px] font-700 ${period === key ? 'text-[#0D2B45]' : 'text-[#738087] hover:text-[#0D2B45]'}`}>
                  {period === key && <motion.span layoutId="report-period-pill" className="absolute inset-0 bg-white border border-[#DEE5E1] rounded-lg shadow-xs" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <motion.button type="button" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={handleExportCSV} className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1E7D3B] text-white text-[11px] font-700 shadow-sm"><Icon name="download" className="w-4 h-4" /> Export</motion.button>
              <motion.button type="button" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={() => window.print()} className="flex-1 sm:flex-none cursor-pointer inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#DDE4E0] bg-white text-[#0D2B45] text-[11px] font-700"><Icon name="print" className="w-4 h-4" /> Print</motion.button>
            </div>
          </div>
        </div>

        <motion.div layout className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
          {kpis.map((kpi, index) => (
            <motion.article key={kpi.label} layout initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.5 }} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="group rounded-[20px] bg-white border border-[#DFE6E2] p-4 sm:p-5 shadow-[0_1px_2px_rgba(13,43,69,.03),0_9px_24px_rgba(13,43,69,.045)]">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[10px] sm:text-[11px] font-700 uppercase tracking-[0.1em] text-[#748188] leading-tight">{kpi.label}</div>
                <motion.span whileHover={{ rotate: -7, scale: 1.08 }} className={`w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${toneMap[kpi.tone]}`}><Icon name={kpi.icon} className="w-4 h-4" /></motion.span>
              </div>
              <div className="mt-5 text-xl sm:text-[27px] font-800 tracking-[-0.045em] text-[#10212B] tnum truncate"><AnimatedValue value={kpi.value} format={kpi.format} /></div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] text-[#738087] truncate">{kpi.note}</span>
                {kpi.change !== null && <span className={`shrink-0 text-[10px] font-800 px-1.5 py-0.5 rounded-md ${kpi.change >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%</span>}
              </div>
            </motion.article>
          ))}
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          {[
            ['Average order', compactPHP(report.averageOrder), `${report.recognizedOrders.length} cleared orders`],
            ['Credit approval', `${report.approvalRate}%`, `${report.currentFinancing.length} applications reviewed`],
            ['Completion rate', `${report.completionRate}%`, `${report.currentOrders.length} orders in period`],
            ['Inventory at cost', compactPHP(report.inventoryCost), `${state.products.length} active catalog records`],
          ].map(([label, value, note], index) => (
            <motion.div key={label} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + index * 0.06 }} className="rounded-2xl border border-[#E2E8E4] bg-[#F8FAF8] px-4 py-3.5">
              <div className="text-[10px] uppercase tracking-[0.1em] font-700 text-[#7B898F]">{label}</div><div className="mt-1 text-lg font-800 text-[#0D2B45] tnum">{value}</div><div className="mt-0.5 text-[10px] text-[#849197] truncate">{note}</div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div key="overview" initial={reducedMotion ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.3 }} className="grid grid-cols-12 gap-5">
              <Panel className="col-span-12 xl:col-span-8 p-5 sm:p-6">
                <PanelHeading eyebrow="Momentum" title="Recognized order volume" detail="Seven-day movement across orders that cleared payment and financing gates." action={<span className="text-[10px] font-700 text-[#65727A] bg-[#F6F8F6] border border-[#E4E8E6] px-2.5 py-1 rounded-lg">Trailing 7 days</span>} />
                <TrendChart data={report.daySeries} />
              </Panel>
              <Panel className="col-span-12 xl:col-span-4 p-5 sm:p-6">
                <PanelHeading eyebrow="Collections" title="Portfolio collection health" detail="Repayments received relative to overdue exposure." />
                <DonutGauge value={report.collectionRate} label="collection health" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl bg-[#F7F9F7] border border-[#E6EBE8] p-3"><div className="text-[9px] uppercase font-700 text-[#849197]">Collected</div><div className="text-sm font-800 text-[#1E7D3B] mt-1 tnum">{compactPHP(report.repaymentCollected)}</div></div>
                  <div className="rounded-xl bg-[#F7F9F7] border border-[#E6EBE8] p-3"><div className="text-[9px] uppercase font-700 text-[#849197]">At risk</div><div className="text-sm font-800 text-red-600 mt-1 tnum">{compactPHP(report.overdueBalance)}</div></div>
                </div>
              </Panel>

              <Panel className="col-span-12 xl:col-span-8 p-5 sm:p-6">
                <PanelHeading eyebrow="Fulfillment" title="Order lifecycle pulse" detail="Every operational stage, including financial holds and customer completion." action={<span className="text-xs font-800 text-[#0D2B45]">{report.currentOrders.length} orders</span>} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                  {report.funnel.map((stage, index) => {
                    const max = Math.max(...report.funnel.map(item => item.count), 1);
                    return (
                      <div key={stage.key} className="group">
                        <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="font-600 text-[#526168]">{stage.label}</span><span className="font-800 text-[#10212B] tnum">{stage.count}</span></div>
                        <div className="h-2 rounded-full bg-[#EEF1EF] overflow-hidden"><motion.div initial={reducedMotion ? false : { width: 0 }} animate={{ width: `${Math.max(stage.count ? 8 : 0, (stage.count / max) * 100)}%` }} transition={{ delay: index * 0.055, duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full" style={{ backgroundColor: stage.color }} /></div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel className="col-span-12 xl:col-span-4 p-5 sm:p-6">
                <PanelHeading eyebrow="Attention" title="Exception queue" detail="Live issues that deserve an administrator decision." />
                {report.alerts.length === 0 ? (
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-5 text-center"><span className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center mx-auto shadow-sm"><Icon name="check" /></span><div className="text-sm font-800 text-emerald-800 mt-3">Operations are clear</div><p className="text-[11px] text-emerald-700/70 mt-1">No aged payments, overdue accounts, stockouts, or stalled deliveries.</p></div>
                ) : (
                  <div className="space-y-2.5">
                    {report.alerts.map((alert, index) => (
                      <motion.button key={alert.title} initial={reducedMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }} whileHover={{ x: 3 }} onClick={() => navigate(alert.page)} className="w-full text-left rounded-xl border border-[#E5EAE7] hover:border-[#C8D5CE] bg-[#FAFBFA] p-3.5 flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.severity === 'critical' ? 'bg-red-50 text-red-600' : alert.severity === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}><Icon name="alert" className="w-4 h-4" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-[11px] font-800 text-[#10212B]">{alert.title}</span><span className="block text-[10px] text-[#748188] mt-0.5 leading-relaxed">{alert.detail}</span></span><Icon name="arrow" className="w-3.5 h-3.5 text-[#A2ADB2] mt-2" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel className="col-span-12 p-5 sm:p-6">
                <PanelHeading eyebrow="Demand" title="Top products by recognized revenue" detail="Only financially cleared orders are counted—pending and cancelled orders are excluded." />
                {report.topProducts.length === 0 ? <EmptyState message="No financially cleared product sales in this period." /> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {report.topProducts.map((product, index) => {
                      const max = Math.max(...report.topProducts.map(item => item.revenue), 1);
                      return <motion.div key={product.id} whileHover={{ y: -2 }} className="rounded-2xl border border-[#E5EAE7] bg-[#FAFBFA] p-4"><div className="flex items-start justify-between gap-3"><span className="w-7 h-7 rounded-lg bg-[#0D2B45] text-white text-[10px] font-800 flex items-center justify-center">{String(index + 1).padStart(2, '0')}</span><div className="text-right"><div className="text-sm font-800 text-[#1E7D3B] tnum">{compactPHP(product.revenue)}</div><div className="text-[9px] text-[#849197]">{product.units} units</div></div></div><div className="mt-3 text-xs font-800 text-[#10212B] truncate">{product.name}</div><div className="text-[10px] text-[#7B898F] mt-0.5">{product.category}</div><div className="mt-3 h-1.5 rounded-full bg-[#E9EEEB] overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${(product.revenue / max) * 100}%` }} transition={{ delay: index * 0.06, duration: 0.7 }} className="h-full bg-[#1E7D3B] rounded-full" /></div></motion.div>;
                    })}
                  </div>
                )}
              </Panel>
            </motion.div>
          )}

          {activeView === 'portfolio' && (
            <motion.div key="portfolio" initial={reducedMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }} className="grid grid-cols-12 gap-5">
              <Panel className="col-span-12 xl:col-span-7 p-5 sm:p-6">
                <PanelHeading eyebrow="Portfolio composition" title="Financing status distribution" detail="Principal deployed across application and repayment states." action={<span className="text-xs font-800 text-[#0D2B45]">{report.currentFinancing.length} accounts</span>} />
                <div className="h-4 rounded-full bg-[#EEF1EF] p-0.5 flex overflow-hidden mb-5">
                  {report.financeBreakdown.map(stage => {
                    const width = report.currentFinancing.length ? (stage.count / report.currentFinancing.length) * 100 : 0;
                    return width > 0 && <motion.div key={stage.key} initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.8 }} className="h-full first:rounded-l-full last:rounded-r-full" style={{ backgroundColor: stage.color }} title={`${stage.label}: ${stage.count}`} />;
                  })}
                </div>
                <div className="space-y-2.5">
                  {report.financeBreakdown.map(stage => (
                    <div key={stage.key} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#F8FAF8] transition-colors"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><span className="flex-1 text-xs font-600 text-[#526168]">{stage.label}</span><span className="text-xs font-800 text-[#10212B] tnum">{stage.count}</span><span className="w-24 text-right text-[11px] text-[#65727A] tnum">{compactPHP(stage.amount)}</span></div>
                  ))}
                </div>
              </Panel>
              <Panel className="col-span-12 xl:col-span-5 p-5 sm:p-6">
                <PanelHeading eyebrow="Repayment book" title="Installment schedule health" detail="Current state of every scheduled repayment in the selected cohort." />
                <div className="grid grid-cols-2 gap-3">
                  {report.scheduleHealth.map(item => {
                    const colors: Record<string, string> = { paid: 'text-emerald-700 bg-emerald-50', due: 'text-amber-700 bg-amber-50', overdue: 'text-red-700 bg-red-50', upcoming: 'text-slate-600 bg-slate-100' };
                    return <motion.div key={item.status} whileHover={{ scale: 1.02 }} className={`rounded-2xl p-4 ${colors[item.status]}`}><div className="text-[10px] uppercase tracking-[0.12em] font-700 opacity-70">{item.status}</div><div className="text-2xl font-800 mt-1 tnum">{item.count}</div><div className="text-[10px] opacity-65 mt-1">installments</div></motion.div>;
                  })}
                </div>
              </Panel>

              <Panel className="col-span-12 p-5 sm:p-6">
                <PanelHeading eyebrow="Concentration" title="Customer credit exposure" detail="Largest utilized credit positions and accounts requiring closer supervision." />
                {report.customerExposure.length === 0 ? <EmptyState message="No active customer credit exposure in this period." /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]"><thead><tr className="text-[10px] uppercase tracking-[0.12em] text-[#849197] border-b border-[#E9EEEB]"><th className="text-left py-3 font-700">Customer</th><th className="text-left py-3 font-700">Exposure</th><th className="text-left py-3 font-700">Utilization</th><th className="text-center py-3 font-700">Loans</th><th className="text-right py-3 font-700">Risk</th></tr></thead><tbody className="divide-y divide-[#EEF1EF]">{report.customerExposure.map(customer => { const utilization = Math.round((customer.used / Math.max(customer.limit, 1)) * 100); return <tr key={customer.id} className="text-xs hover:bg-[#FAFBFA]"><td className="py-3.5"><div className="font-700 text-[#10212B]">{customer.name}</div><div className="text-[10px] text-[#849197] mt-0.5">{customer.store}</div></td><td className="py-3.5 font-800 text-[#0D2B45] tnum">{compactPHP(customer.used)} <span className="text-[10px] font-500 text-[#849197]">/ {compactPHP(customer.limit)}</span></td><td className="py-3.5"><div className="flex items-center gap-2"><div className="w-28 h-1.5 rounded-full bg-[#E9EEEB] overflow-hidden"><div className={`h-full rounded-full ${utilization > 85 ? 'bg-red-500' : utilization > 65 ? 'bg-amber-500' : 'bg-[#1E7D3B]'}`} style={{ width: `${Math.min(utilization, 100)}%` }} /></div><span className="text-[10px] font-700 tnum">{utilization}%</span></div></td><td className="py-3.5 text-center font-700 tnum">{customer.loans}</td><td className="py-3.5 text-right"><span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-700 ${customer.overdue ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{customer.overdue ? 'Overdue' : 'Current'}</span></td></tr>; })}</tbody></table>
                  </div>
                )}
              </Panel>
            </motion.div>
          )}

          {activeView === 'operations' && (
            <motion.div key="operations" initial={reducedMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }} className="grid grid-cols-12 gap-5">
              <Panel className="col-span-12 lg:col-span-5 p-5 sm:p-6">
                <PanelHeading eyebrow="Inventory" title="Catalog health" detail="Available stock health and capital currently held in inventory." />
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    ['Healthy', report.healthyProducts.length, 'text-emerald-700 bg-emerald-50'],
                    ['Low', report.lowStockProducts.length, 'text-amber-700 bg-amber-50'],
                    ['Out', report.outOfStockProducts.length, 'text-red-700 bg-red-50'],
                  ].map(([label, value, style]) => <div key={String(label)} className={`rounded-xl p-3 text-center ${style}`}><div className="text-xl font-800 tnum">{value}</div><div className="text-[9px] uppercase tracking-wider font-700 mt-1 opacity-75">{label}</div></div>)}
                </div>
                <div className="space-y-3 text-xs"><div className="flex justify-between"><span className="text-[#65727A]">Inventory at cost</span><span className="font-800 text-[#10212B] tnum">{compactPHP(report.inventoryCost)}</span></div><div className="flex justify-between"><span className="text-[#65727A]">Potential retail value</span><span className="font-800 text-[#10212B] tnum">{compactPHP(report.inventoryRetail)}</span></div><div className="flex justify-between pt-3 border-t border-[#E9EEEB]"><span className="text-[#65727A]">Potential gross spread</span><span className="font-800 text-[#1E7D3B] tnum">{compactPHP(report.inventoryRetail - report.inventoryCost)}</span></div></div>
              </Panel>
              <Panel className="col-span-12 lg:col-span-7 p-5 sm:p-6">
                <PanelHeading eyebrow="Settlement mix" title="Payment channel performance" detail="Actual paid transactions dated by settlement time, not order creation time." />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['Purchases', report.purchasePayments],
                    ['Installments', report.repaymentPayments.filter(payment => payment.type === 'installment')],
                    ['Full settlements', report.repaymentPayments.filter(payment => payment.type === 'full_settlement')],
                  ].map(([label, payments]) => {
                    const list = payments as typeof report.settledPayments;
                    const total = list.reduce((sum, payment) => sum + payment.amount, 0);
                    const gcash = list.filter(payment => payment.method === 'gcash').reduce((sum, payment) => sum + payment.amount, 0);
                    const cash = total - gcash;
                    const gcashShare = Math.round((gcash / Math.max(total, 1)) * 100);
                    return <motion.div key={String(label)} whileHover={{ y: -2 }} className="rounded-2xl border border-[#E5EAE7] bg-[#FAFBFA] p-4"><div className="text-[10px] uppercase tracking-[0.1em] font-700 text-[#7B898F]">{label as string}</div><div className="text-xl font-800 text-[#10212B] mt-2 tnum">{compactPHP(total)}</div><div className="mt-4 h-2 rounded-full bg-[#0D2B45] overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${gcashShare}%` }} transition={{ duration: 0.7 }} className="h-full bg-[#7DBE4C]" /></div><div className="flex justify-between mt-2 text-[9px] text-[#7B898F]"><span>Cash {compactPHP(cash)}</span><span>GCash {compactPHP(gcash)}</span></div><div className="mt-3 pt-3 border-t border-[#E7ECE9] text-[10px] font-700 text-[#526168]">{list.length} settled transactions</div></motion.div>;
                  })}
                </div>
              </Panel>

              <Panel className="col-span-12 xl:col-span-7 p-5 sm:p-6">
                <PanelHeading eyebrow="Supply network" title="Supplier operating scorecard" detail="Recognized order contribution, live fulfillment load, and catalog risk." />
                {report.supplierScores.length === 0 ? <EmptyState message="No supplier activity is available for this period." /> : <div className="space-y-2.5">{report.supplierScores.map((supplier, index) => <motion.div key={supplier.id} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-[#E6EBE8] bg-[#FAFBFA] p-3.5"><span className="w-8 h-8 rounded-lg bg-[#0D2B45] text-white flex items-center justify-center text-[10px] font-800">{index + 1}</span><div className="min-w-0"><div className="text-xs font-800 text-[#10212B] truncate">{supplier.name}</div><div className="text-[9px] text-[#849197] mt-0.5">{supplier.products} SKUs · {supplier.orders} orders</div></div><div className="hidden sm:block text-center"><div className="text-xs font-800 text-[#0D2B45] tnum">{supplier.activeJobs}</div><div className="text-[9px] text-[#849197]">live jobs</div></div><div className="hidden sm:block text-center"><div className={`text-xs font-800 tnum ${supplier.lowStock ? 'text-amber-700' : 'text-emerald-700'}`}>{supplier.lowStock}</div><div className="text-[9px] text-[#849197]">stock risks</div></div><div className="text-right"><div className="text-xs font-800 text-[#1E7D3B] tnum">{compactPHP(supplier.revenue)}</div><div className="text-[9px] text-[#849197]">recognized</div></div></motion.div>)}</div>}
              </Panel>
              <Panel className="col-span-12 xl:col-span-5 p-5 sm:p-6">
                <PanelHeading eyebrow="Customers" title="Highest-value stores" detail="Top customers ranked by financially cleared order value." />
                {report.topCustomers.length === 0 ? <EmptyState message="No recognized customer orders in this period." /> : <div className="space-y-2">{report.topCustomers.map((customer, index) => <div key={customer.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#F8FAF8]"><span className="w-7 h-7 rounded-full bg-[#EAF3ED] text-[#1E7D3B] text-[10px] font-800 flex items-center justify-center">{customer.name.charAt(0)}</span><div className="flex-1 min-w-0"><div className="text-[11px] font-800 text-[#10212B] truncate">{customer.store}</div><div className="text-[9px] text-[#849197] truncate">{customer.name} · {customer.orders} orders</div></div><div className="text-xs font-800 text-[#0D2B45] tnum">{compactPHP(customer.value)}</div></div>)}</div>}
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </InternalLayout>
  );
}
