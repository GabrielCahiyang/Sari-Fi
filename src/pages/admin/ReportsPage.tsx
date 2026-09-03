import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useApp } from "../../context/AppContext";
import { InternalLayout } from "../../components/layout/InternalLayout";
import type { OrderItem } from "../../types";
import logo from "../../assets/sarifi-logo.png";

type Period = "all" | "month" | "week" | "today";

export function ReportsPage() {
  const { state, navigate, formatPHP, showToast } = useApp();
  const [period, setPeriod] = useState<Period>("month");

  const now = useMemo(() => new Date(), []);

  // Compute date bounds based on selected period
  const bounds = useMemo(() => {
    if (period === "all") return null;
    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    if (period === "week") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6,
      );
      const end = new Date(now);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    // month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }, [period, now]);

  const inBounds = (dateStr?: string) => {
    if (!dateStr) return false;
    if (!bounds) return true;
    const d = new Date(dateStr);
    return d >= bounds.start && d < bounds.end;
  };

  // Filtered dataset calculations
  const reportData = useMemo(() => {
    const isCleared = (status: string) =>
      !["pending_payment", "pending_financing", "cancelled"].includes(status);

    const currentOrders = state.orders.filter((o) => inBounds(o.createdAt));
    const recognizedOrders = currentOrders.filter((o) => isCleared(o.status));
    const grossSales = recognizedOrders.reduce((sum, o) => sum + o.total, 0);

    const settledPayments = state.payments.filter(
      (p) => p.status === "paid" && inBounds(p.paidAt || p.createdAt),
    );
    const purchasePayments = settledPayments.filter(
      (p) => p.type === "purchase",
    );
    const cashPurchases = purchasePayments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + p.amount, 0);
    const gcashPurchases = purchasePayments
      .filter((p) => p.method === "gcash")
      .reduce((sum, p) => sum + p.amount, 0);

    const currentFinancing = state.financing.filter((f) =>
      inBounds(f.createdAt),
    );
    const activeFinancing = state.financing.filter(
      (f) => f.status === "active" || f.status === "overdue",
    );
    const financedPrincipal = currentFinancing.reduce(
      (sum, f) => sum + f.principal,
      0,
    );

    const outstandingBalance = activeFinancing.reduce(
      (sum, f) =>
        sum +
        (f.totalRepayable -
          (f.paidPrincipal / Math.max(f.principal, 1)) * f.totalRepayable),
      0,
    );

    const overdueBalance = state.financing
      .filter((f) => f.status === "overdue")
      .reduce(
        (sum, f) =>
          sum +
          (f.totalRepayable -
            (f.paidPrincipal / Math.max(f.principal, 1)) * f.totalRepayable),
        0,
      );

    const repaymentPayments = settledPayments.filter(
      (p) => p.type === "installment" || p.type === "full_settlement",
    );
    const repaymentsCollected = repaymentPayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    const totalExposure = repaymentsCollected + overdueBalance;
    const collectionRate =
      totalExposure > 0
        ? Math.round((repaymentsCollected / totalExposure) * 100)
        : 100;

    // 7-day sales momentum series
    const daySeries = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (6 - i),
      );
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayTotal = state.orders
        .filter(
          (o) =>
            isCleared(o.status) &&
            new Date(o.createdAt) >= d &&
            new Date(o.createdAt) < nextD,
        )
        .reduce((sum, o) => sum + o.total, 0);
      return {
        label: d.toLocaleDateString("en-PH", { weekday: "short" }),
        date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
        value: dayTotal,
      };
    });

    // Top selling products by recognized sales
    const productSalesMap = new Map<
      string,
      { name: string; category: string; units: number; revenue: number }
    >();
    recognizedOrders.forEach((o) => {
      const items: OrderItem[] = Array.isArray(o.items)
        ? o.items
        : o.items
          ? Object.values(o.items)
          : [];
      items.forEach((it: OrderItem) => {
        const existing = productSalesMap.get(it.productId) || {
          name: it.productName,
          category:
            state.products.find((p) => p.id === it.productId)?.category ||
            "General",
          units: 0,
          revenue: 0,
        };
        existing.units += it.quantity;
        existing.revenue += it.price * it.quantity;
        productSalesMap.set(it.productId, existing);
      });
    });
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Order funnel counts
    const funnelStages = [
      {
        label: "Pending Review",
        count: currentOrders.filter(
          (o) =>
            o.status === "pending_payment" || o.status === "pending_financing",
        ).length,
        color: "#F59E0B",
      },
      {
        label: "Approved & Packing",
        count: currentOrders.filter(
          (o) => o.status === "approved" || o.status === "processing",
        ).length,
        color: "#3B82F6",
      },
      {
        label: "Out for Delivery",
        count: currentOrders.filter(
          (o) => o.status === "out_for_delivery" || o.status === "delivered",
        ).length,
        color: "#10B981",
      },
      {
        label: "Completed Orders",
        count: currentOrders.filter((o) => o.status === "completed").length,
        color: "#1E7D3B",
      },
    ];

    // Customer credit exposure
    const customerExposure = state.customers
      .filter((c) => (c.usedCredit || 0) > 0)
      .map((c) => {
        const limit = c.creditLimit || 6000;
        const used = c.usedCredit || 0;
        const utilization = Math.min(100, Math.round((used / limit) * 100));
        const hasOverdue = state.financing.some(
          (f) => f.customerId === c.id && f.status === "overdue",
        );
        const store =
          c.storeName && c.storeName.toLowerCase() !== "individual buyer"
            ? c.storeName
            : `${c.fullName}'s Sari-Sari Store`;
        return {
          id: c.id,
          name: c.fullName,
          store,
          used,
          limit,
          utilization,
          hasOverdue,
        };
      })
      .sort((a, b) => b.used - a.used)
      .slice(0, 6);

    // Supplier performance
    const supplierScores = state.suppliers
      .map((s) => {
        const supplierOrders = recognizedOrders.filter((o) => {
          const items: OrderItem[] = Array.isArray(o.items)
            ? o.items
            : o.items
              ? Object.values(o.items)
              : [];
          return items.some((it: OrderItem) => it.supplierId === s.id);
        });
        const supplierRev = supplierOrders.reduce((sum, o) => {
          const items: OrderItem[] = Array.isArray(o.items)
            ? o.items
            : o.items
              ? Object.values(o.items)
              : [];
          return (
            sum +
            items
              .filter((it: OrderItem) => it.supplierId === s.id)
              .reduce(
                (isum: number, it: OrderItem) => isum + it.price * it.quantity,
                0,
              )
          );
        }, 0);
        const supplierProds = state.products.filter(
          (p) => p.supplierId === s.id,
        );
        const lowStockCount = supplierProds.filter(
          (p) => p.stock <= p.reorderLevel,
        ).length;

        return {
          id: s.id,
          name: s.name,
          orders: supplierOrders.length,
          revenue: supplierRev,
          productsCount: supplierProds.length,
          lowStockCount,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Recent transaction feed
    const recentActivity = state.payments.slice(0, 5).map((p) => {
      const isRepayment =
        p.type === "installment" || p.type === "full_settlement";
      const customer = state.customers.find((c) => c.id === p.customerId);
      return {
        id: p.id,
        title: isRepayment
          ? `Installment Payment (${customer?.storeName || "Store"})`
          : `Wholesale Order Settlement`,
        subtitle: p.paidAt
          ? new Date(p.paidAt).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })
          : "Recent",
        method: p.method === "gcash" ? "GCash E-Wallet" : "Cash Bills",
        amount: p.amount,
        type: p.method,
        isPositive: true,
      };
    });

    return {
      grossSales,
      recognizedOrdersCount: recognizedOrders.length,
      cashPurchases,
      gcashPurchases,
      financedPrincipal,
      activeFinancingCount: activeFinancing.length,
      outstandingBalance,
      overdueBalance,
      repaymentsCollected,
      collectionRate,
      daySeries,
      topProducts,
      funnelStages,
      customerExposure,
      supplierScores,
      recentActivity,
    };
  }, [state, bounds, now]);

  const periodLabel =
    period === "all"
      ? "All Time"
      : period === "month"
        ? "This Month"
        : period === "week"
          ? "Past 7 Days"
          : "Today";

  // Export clean CSV
  const handleExportCSV = () => {
    const rows: (string | number)[][] = [
      ["SARI-FI EXECUTIVE FINANCIAL REPORT"],
      ["Generated Date", now.toLocaleString("en-PH")],
      ["Reporting Scope", periodLabel],
      [],
      ["CORE FINANCIAL METRICS"],
      ["Recognized Order Sales (PHP)", reportData.grossSales.toFixed(2)],
      ["Direct Cash Purchases (PHP)", reportData.cashPurchases.toFixed(2)],
      ["Direct GCash Purchases (PHP)", reportData.gcashPurchases.toFixed(2)],
      [
        "Financed Order Principal (PHP)",
        reportData.financedPrincipal.toFixed(2),
      ],
      [
        "Outstanding Receivables (PHP)",
        reportData.outstandingBalance.toFixed(2),
      ],
      ["Overdue Balance at Risk (PHP)", reportData.overdueBalance.toFixed(2)],
      [
        "Installments Collected (PHP)",
        reportData.repaymentsCollected.toFixed(2),
      ],
      ["Collection Health Rate (%)", `${reportData.collectionRate}%`],
      [],
      ["TOP SELLING WHOLESALE PRODUCTS"],
      ["Product Name", "Category", "Units Sold", "Revenue (PHP)"],
      ...reportData.topProducts.map((p) => [
        p.name,
        p.category,
        p.units,
        p.revenue.toFixed(2),
      ]),
      [],
      ["STORE CREDIT EXPOSURE"],
      [
        "Customer Name",
        "Store Name",
        "Used Credit (PHP)",
        "Credit Limit (PHP)",
        "Utilization (%)",
      ],
      ...reportData.customerExposure.map((c) => [
        c.name,
        c.store,
        c.used.toFixed(2),
        c.limit.toFixed(2),
        `${c.utilization}%`,
      ]),
    ];

    const escape = (val: string | number) => {
      const s = String(val ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const csvContent = rows.map((r) => r.map(escape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SariFi_Report_${period}_${now.toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("success", "Report exported successfully to CSV.");
  };

  const totalDirectSales = reportData.cashPurchases + reportData.gcashPurchases;
  const cashShare =
    totalDirectSales > 0
      ? Math.round((reportData.cashPurchases / totalDirectSales) * 100)
      : 0;
  const gcashShare =
    totalDirectSales > 0
      ? Math.round((reportData.gcashPurchases / totalDirectSales) * 100)
      : 0;

  const maxDayValue = Math.max(
    ...reportData.daySeries.map((d) => d.value),
    1000,
  );

  return (
    <InternalLayout title="Reports & Analytics">
      <div className="space-y-5 print:space-y-4 max-w-7xl mx-auto">
        {/* Printable Executive Header */}
        <div className="hidden print:block pb-4 mb-4 border-b-2 border-[#0D2B45]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sari-Fi" className="h-10 object-contain" />
              <div>
                <h1 className="text-xl font-800 text-[#0D2B45] tracking-tight">
                  SARI-FI FINANCIAL & OPERATIONS REPORT
                </h1>
                <p className="text-xs text-[#65727A]">
                  Wholesale Marketplace & Revolving Micro-Credit Infrastructure
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-[#65727A]">
              <div className="font-800 text-[#10212B]">
                {now.toLocaleDateString("en-PH", { dateStyle: "full" })}
              </div>
              <div>
                Reporting Scope:{" "}
                <span className="font-700 text-[#0D2B45]">{periodLabel}</span>
              </div>
              <div>
                Generated by:{" "}
                <span className="font-600 text-[#0D2B45]">
                  {state.currentUser?.name || "Administrator"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Filter Pill Bar - Matches Retail Fintech Style */}
        <div className="no-print bg-white rounded-3xl border border-[#E4E8E6] p-3 sm:p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#F7F8F6] p-1 rounded-2xl border border-[#E4E8E6] self-start sm:self-auto overflow-x-auto">
            {(
              [
                ["today", "Today"],
                ["week", "Past 7 Days"],
                ["month", "This Month"],
                ["all", "All Time"],
              ] as [Period, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-700 transition-all cursor-pointer ${
                  period === key
                    ? "bg-[#0D2B45] text-white shadow-xs"
                    : "text-[#65727A] hover:text-[#0D2B45] hover:bg-white/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1E7D3B] hover:bg-[#165f2c] text-white text-xs font-700 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F7F8F6] text-[#0D2B45] border border-[#E4E8E6] text-xs font-700 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            BENTO GRID HERO ROW (Inspired directly by user reference)
            Left (Col 7): Digital Treasury Hero Card (Dark Navy with Virtual Card preview)
            Right (Col 5): Rewards & Collection Health Card (Clean White with Gold Coins/Crown)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4 sm:gap-5 print:grid-cols-12">
          {/* Card 1: Digital Treasury (Matches "Digital Wallet" Card in reference) */}
          <div className="col-span-12 lg:col-span-7 bg-gradient-to-br from-[#0D2B45] via-[#0F3252] to-[#0A1F33] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col justify-between print-break-inside-avoid print:bg-white print:text-[#10212B] print:border print:border-slate-300">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none print:hidden"></div>

            <div>
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-700 text-sm sm:text-base tracking-tight text-white print:text-[#10212B]">
                    Wholesale Treasury
                  </span>
                </div>
                <button
                  onClick={() => navigate("admin/orders")}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer print:hidden"
                  title="View Orders"
                >
                  +
                </button>
              </div>

              {/* Main Balance and Virtual Card Graphic */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <div className="text-xs text-emerald-300/80 font-600 uppercase tracking-wider print:text-slate-500">
                    Recognized Sales Balance
                  </div>
                  <div className="font-800 text-2xl sm:text-3xl lg:text-4xl text-white mt-1 tnum print:text-[#10212B]">
                    {formatPHP(reportData.grossSales)}
                  </div>
                  <div className="text-[11px] text-white/60 mt-1 print:text-slate-500">
                    {reportData.recognizedOrdersCount} cleared orders in{" "}
                    {periodLabel.toLowerCase()}
                  </div>
                </div>

                {/* Executive Operational Summary Pod */}
                <div className="w-full sm:w-56 rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/15 flex flex-col justify-between shrink-0 print:bg-white print:border-slate-300">
                  <div className="flex items-center justify-between text-[11px] text-white/75 font-600 print:text-slate-600">
                    <span>Order Velocity</span>
                    <span className="text-emerald-300 font-bold print:text-emerald-700">
                      100% Cleared
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-[10px] uppercase tracking-wider text-white/50 print:text-slate-500">
                      Average Order (AOV)
                    </div>
                    <div className="text-base font-800 text-white tnum print:text-[#10212B]">
                      {formatPHP(
                        reportData.recognizedOrdersCount > 0
                          ? Math.round(
                              reportData.grossSales /
                                reportData.recognizedOrdersCount,
                            )
                          : 0,
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/70 pt-2 border-t border-white/10 print:border-slate-200 print:text-slate-600">
                    <span>Direct Cash/GCash</span>
                    <span className="font-bold text-white print:text-[#10212B] tnum">
                      {formatPHP(totalDirectSales)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar: Financing Deployment vs Direct Sales */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-white/80 mb-1.5 print:text-[#10212B]">
                  <span>Financing Capital Deployed</span>
                  <span className="font-bold text-emerald-300 print:text-emerald-700 tnum">
                    {formatPHP(reportData.financedPrincipal)}
                  </span>
                </div>
                <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden print:bg-slate-200">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-[#7DBE4C] h-full rounded-full"
                    style={{
                      width: `${reportData.grossSales > 0 ? Math.min(100, Math.round((reportData.financedPrincipal / reportData.grossSales) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Action Pill Buttons (Styled exactly like [Top Up] and [Send Money]) */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 no-print">
              <button
                onClick={handleExportCSV}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-700 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <span>📥</span>
                <span>Export Dataset</span>
              </button>
              <button
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-700 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <span>🖨</span>
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Card 2: Collection Health & Risk Rating */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs flex flex-col justify-between print-break-inside-avoid print:border-slate-300">
            <div>
              {/* Header with Title and Verified Shield badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-700 text-base text-[#10212B]">
                    Portfolio Collection Health
                  </h3>
                  <div className="text-xs text-[#65727A] mt-0.5">
                    Repayment performance & risk status
                  </div>
                </div>

                {/* Verified Shield Icon Badge */}
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#1E7D3B] shadow-xs shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>

              {/* Big Score Number */}
              <div className="mt-3">
                <div className="text-xs text-[#65727A] font-600">
                  Recovery Health Rate
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-800 text-3xl sm:text-4xl text-[#0D2B45] tnum">
                    {reportData.collectionRate}%
                  </span>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    {reportData.collectionRate >= 80
                      ? "Grade A (Prime)"
                      : "Moderate Risk"}
                  </span>
                </div>
              </div>

              {/* Metric Quick Stats */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="p-3 rounded-2xl bg-[#F7F8F6] border border-[#E4E8E6]">
                  <div className="text-[10px] uppercase font-700 text-[#65727A]">
                    Collected
                  </div>
                  <div className="text-sm font-800 text-[#1E7D3B] mt-0.5 tnum">
                    {formatPHP(reportData.repaymentsCollected)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#F7F8F6] border border-[#E4E8E6]">
                  <div className="text-[10px] uppercase font-700 text-[#65727A]">
                    At Risk (Overdue)
                  </div>
                  <div className="text-sm font-800 text-red-600 mt-0.5 tnum">
                    {formatPHP(reportData.overdueBalance)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              {/* Primary Action Button (Matches the navy "Redeem" button) */}
              <button
                onClick={() => navigate("admin/financing")}
                className="w-full py-2.5 px-4 bg-[#0D2B45] hover:bg-[#163b5c] text-white text-xs font-700 rounded-xl transition-all cursor-pointer shadow-xs text-center"
              >
                Review Active Credit Queue →
              </button>

              {/* Bottom Progress Bar: 0 Overdue Target */}
              <div className="mt-3 pt-2">
                <div className="w-full bg-[#F7F8F6] h-2 rounded-full overflow-hidden border border-[#E4E8E6]">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${reportData.collectionRate}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#65727A] mt-1 text-center font-medium">
                  {reportData.overdueBalance > 0
                    ? `${formatPHP(reportData.overdueBalance)} remaining to reach zero-overdue`
                    : "100% On-Time Repayment Standing"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            BENTO GRID ROW 2 (Matches BNPL & Quick Scan Cards in reference)
            Left (Col 7): Active Installments (BNPL) Card
            Right (Col 5): Quick Scan / Settlement Channels Gradient Card
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4 sm:gap-5 print:grid-cols-12">
          {/* Card 3: Active Installments (BNPL) */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs flex flex-col justify-between print-break-inside-avoid print:border-slate-300">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-700 text-base text-[#10212B]">
                  Active Installments (BNPL Credit)
                </h3>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-700 rounded-lg">
                  Revolving
                </span>
              </div>

              {/* Main BNPL Numbers (Matches the reference screenshot layout) */}
              <div className="flex items-center justify-between mt-2 py-3 border-y border-[#F7F8F6]">
                <div>
                  <div className="text-sm font-800 text-[#10212B]">
                    {reportData.activeFinancingCount} active plans
                  </div>
                  <div className="text-xs text-[#65727A] mt-0.5">
                    Total remaining principal
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-800 text-[#0D2B45] tnum">
                  {formatPHP(reportData.outstandingBalance)}
                </div>
              </div>
            </div>

            {/* Store Partner Chips (Matches the brand logos in reference) */}
            <div className="mt-4 pt-1">
              <div className="text-[11px] text-[#65727A] font-600 mb-2">
                Partner Stores on Active Credit:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {reportData.customerExposure.length === 0 ? (
                  <span className="text-xs text-[#65727A]">
                    All store credit accounts current
                  </span>
                ) : (
                  reportData.customerExposure.map((c) => (
                    <div
                      key={c.id}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F7F8F6] border border-[#E4E8E6] flex items-center gap-2 text-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-700 text-[#10212B]">{c.store}</span>
                      <span className="text-[10px] text-[#65727A] font-mono tnum">
                        ({c.utilization}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Settlement Channels (Matches "Quick Scan" Card in reference) */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 rounded-3xl border border-teal-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between print-break-inside-avoid print:bg-white print:border-slate-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-700 text-base text-[#0D2B45]">
                  Settlement Channels
                </h3>
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider bg-teal-200/60 px-2 py-0.5 rounded-md">
                  QR & Cash
                </span>
              </div>
              {/* Dual Channel Split Cards */}
              <div className="grid grid-cols-2 gap-2.5 my-3">
                <div className="p-3 rounded-2xl bg-white border border-teal-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-teal-900 font-bold">
                    <span>💵 Cash Bills</span>
                    <span className="font-mono text-xs">{cashShare}%</span>
                  </div>
                  <div className="text-sm font-800 text-[#0D2B45] mt-1.5 tnum">
                    {formatPHP(reportData.cashPurchases)}
                  </div>
                  <div className="text-[10px] text-teal-800/70 mt-0.5">
                    Direct Counter Cash
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-teal-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-teal-900 font-bold">
                    <span>📲 GCash</span>
                    <span className="font-mono text-xs">{gcashShare}%</span>
                  </div>
                  <div className="text-sm font-800 text-[#1E7D3B] mt-1.5 tnum">
                    {formatPHP(reportData.gcashPurchases)}
                  </div>
                  <div className="text-[10px] text-teal-800/70 mt-0.5">
                    E-Wallet Direct
                  </div>
                </div>
              </div>

              {/* Unified Distribution Bar */}
              <div className="my-2">
                <div className="flex justify-between text-[11px] text-teal-950 font-600 mb-1.5">
                  <span>Cash Share: {cashShare}%</span>
                  <span>GCash Share: {gcashShare}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/70 overflow-hidden flex">
                  {totalDirectSales > 0 ? (
                    <>
                      <div
                        className="h-full bg-[#0D2B45] transition-all"
                        style={{ width: `${cashShare}%` }}
                        title={`Cash: ${cashShare}%`}
                      />
                      <div
                        className="h-full bg-[#1E7D3B] transition-all"
                        style={{ width: `${gcashShare}%` }}
                        title={`GCash: ${gcashShare}%`}
                      />
                    </>
                  ) : (
                    <div className="h-full w-full bg-slate-200/80" title="No settlements recorded" />
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Button Pill (Matches "Scan to Pay" pill in reference) */}
            <div className="mt-4 pt-1">
              <button
                onClick={() => navigate("admin/payments")}
                className="w-full py-2 px-3 bg-[#0D2B45] hover:bg-[#163b5c] text-white text-xs font-700 rounded-xl transition-all cursor-pointer shadow-xs text-center"
              >
                View Payment Ledger ({formatPHP(totalDirectSales)}) →
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            BENTO GRID ROW 3: RECENT ACTIVITY & ORDER MOVEMENT
            Left (Col 6): Recent Activity List (Matches "Recent Activity" in reference)
            Right (Col 6): 7-Day Order Volume (Movement Chart)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4 sm:gap-5 print:grid-cols-12">
          {/* Card 5: Recent Activity (Matches "Recent Activity" in reference) */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-3xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs flex flex-col justify-between print-break-inside-avoid print:border-slate-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-700 text-base text-[#10212B]">
                  Recent Activity
                </h3>
                <button
                  onClick={() => navigate("admin/payments")}
                  className="text-xs text-[#1E7D3B] font-700 hover:underline cursor-pointer"
                >
                  View all →
                </button>
              </div>

              {/* Activity Rows with Icons (Amazon, Starbucks style from screenshot) */}
              <div className="space-y-3">
                {reportData.recentActivity.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#65727A]">
                    No recent activity recorded
                  </div>
                ) : (
                  reportData.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between py-2 border-b border-[#F7F8F6] last:border-0 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Rounded Square Brand/Activity Badge */}
                        <div className="w-10 h-10 rounded-2xl bg-[#F7F8F6] border border-[#E4E8E6] flex items-center justify-center text-base shrink-0">
                          {act.type === "gcash" ? "📲" : "💵"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-700 text-[#10212B] truncate">
                            {act.title}
                          </div>
                          <div className="text-[11px] text-[#65727A]">
                            {act.subtitle} · {act.method}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-800 text-[#1E7D3B] tnum">
                          + {formatPHP(act.amount)}
                        </div>
                        <div className="text-[10px] text-[#65727A] font-mono">
                          Cleared
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#F7F8F6] text-xs text-[#65727A] flex items-center justify-between">
              <span>Settlement Status: Active</span>
              <span className="font-bold text-[#0D2B45] tnum">
                {state.payments.length} total records
              </span>
            </div>
          </div>

          {/* Card 6: 7-Day Recognized Order Volume */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-3xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs flex flex-col justify-between print-break-inside-avoid print:border-slate-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-700 text-base text-[#10212B]">
                    Order Volume Movement
                  </h3>
                  <p className="text-xs text-[#65727A] mt-0.5">
                    Seven-day cleared wholesale order velocity
                  </p>
                </div>
                <span className="text-[11px] font-700 text-[#1E7D3B] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  Trailing 7 Days
                </span>
              </div>

              {/* Sleek Daily Bar Visualization */}
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-36 border-b border-[#E4E8E6] pb-2">
                  {reportData.daySeries.map((d, i) => {
                    const barHeight =
                      maxDayValue > 0
                        ? Math.max(8, Math.round((d.value / maxDayValue) * 100))
                        : 8;
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-1.5 h-full justify-end group"
                      >
                        <div className="text-[10px] font-700 text-[#65727A] group-hover:text-[#1E7D3B] transition-colors tnum">
                          {d.value > 0
                            ? `₱${(d.value / 1000).toFixed(1)}k`
                            : "₱0"}
                        </div>
                        <div className="w-full max-w-[38px] bg-[#F7F8F6] rounded-t-xl overflow-hidden flex items-end h-24 print:border print:border-slate-200">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${barHeight}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="w-full bg-[#1E7D3B] group-hover:bg-[#165f2c] rounded-t-xl transition-colors"
                          />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-700 text-[#10212B]">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Printable Daily Breakdown Table */}
              <div className="hidden print:grid grid-cols-7 gap-2 pt-3 mt-2 border-t border-slate-200 text-center text-xs">
                {reportData.daySeries.map((d, i) => (
                  <div
                    key={i}
                    className="p-1.5 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="text-[10px] text-slate-500 font-700">
                      {d.label}
                    </div>
                    <div className="text-[9px] text-slate-400">{d.date}</div>
                    <div className="font-800 text-[#10212B] text-[11px] mt-0.5 tnum">
                      {formatPHP(d.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 text-xs text-[#65727A] flex items-center justify-between">
              <span>Peak Day Sales:</span>
              <span className="font-bold text-[#1E7D3B] tnum">
                {formatPHP(
                  Math.max(...reportData.daySeries.map((d) => d.value)),
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            BENTO GRID ROW 4: TOP SELLING WHOLESALE GOODS & SUPPLIER SCORECARD
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4 sm:gap-5 print:grid-cols-12">
          {/* Top Selling Wholesale Goods */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-3xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs print-break-inside-avoid print:border-slate-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-700 text-base text-[#10212B]">
                  Top Selling Wholesale Goods
                </h3>
                <p className="text-xs text-[#65727A] mt-0.5">
                  Highest volume SKUs cleared by sales
                </p>
              </div>
              <button
                onClick={() => navigate("admin/products")}
                className="text-xs text-[#1E7D3B] font-700 hover:underline cursor-pointer"
              >
                Catalog →
              </button>
            </div>

            {reportData.topProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#65727A]">
                No product sales recorded in this period
              </div>
            ) : (
              <div className="space-y-2.5">
                {reportData.topProducts.map((prod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl border border-[#E4E8E6] bg-[#F7F8F6] hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-xl bg-[#0D2B45] text-white flex items-center justify-center text-xs font-800 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-700 text-[#10212B] truncate">
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-[#65727A]">
                          {prod.category} · {prod.units} units sold
                        </div>
                      </div>
                    </div>
                    <span className="font-800 text-xs sm:text-sm text-[#1E7D3B] shrink-0 tnum">
                      {formatPHP(prod.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wholesale Supplier Scorecard */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-3xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs print-break-inside-avoid print:border-slate-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-700 text-base text-[#10212B]">
                  Wholesale Supplier Scorecard
                </h3>
                <p className="text-xs text-[#65727A] mt-0.5">
                  Distributor fulfillment load and revenue share
                </p>
              </div>
              <button
                onClick={() => navigate("admin/suppliers")}
                className="text-xs text-[#1E7D3B] font-700 hover:underline cursor-pointer"
              >
                Suppliers →
              </button>
            </div>

            {reportData.supplierScores.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#65727A]">
                No supplier activity in this period
              </div>
            ) : (
              <div className="space-y-2.5">
                {reportData.supplierScores.map((sup, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl border border-[#E4E8E6] bg-[#F7F8F6] hover:bg-white transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-700 text-[#10212B] truncate">
                        {sup.name}
                      </div>
                      <div className="text-[10px] text-[#65727A] mt-0.5">
                        {sup.productsCount} catalog SKUs · {sup.orders} orders
                        fulfilled
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-800 text-xs sm:text-sm text-[#10212B] tnum">
                        {formatPHP(sup.revenue)}
                      </div>
                      <div
                        className={`text-[10px] font-700 ${sup.lowStockCount > 0 ? "text-amber-600" : "text-emerald-700"}`}
                      >
                        {sup.lowStockCount > 0
                          ? `${sup.lowStockCount} low-stock SKUs`
                          : "Stock healthy"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            BENTO GRID ROW 5: STORE CREDIT UTILIZATION LEDGER
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-[#E4E8E6] p-5 sm:p-6 shadow-xs print-break-inside-avoid print:border-slate-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-700 text-base text-[#10212B]">
                Sari-Sari Store Credit Exposure
              </h3>
              <p className="text-xs text-[#65727A] mt-0.5">
                Active revolving credit lines, utilization rates, and repayment
                standing
              </p>
            </div>
            <button
              onClick={() => navigate("admin/customers")}
              className="text-xs text-[#1E7D3B] font-700 hover:underline cursor-pointer"
            >
              Stores →
            </button>
          </div>

          {reportData.customerExposure.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#65727A]">
              No active store credit exposure currently utilized.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#65727A] border-b border-[#E4E8E6] text-left print:border-slate-300">
                    <th className="pb-3 font-700">Store Owner</th>
                    <th className="pb-3 font-700">Store Name</th>
                    <th className="pb-3 font-700">Credit Balance</th>
                    <th className="pb-3 font-700">Line Utilization</th>
                    <th className="pb-3 font-700 text-right">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7F8F6] print:divide-slate-200">
                  {reportData.customerExposure.map((cust) => (
                    <tr
                      key={cust.id}
                      className="hover:bg-[#F7F8F6] transition-colors print-break-inside-avoid"
                    >
                      <td className="py-3 font-700 text-[#10212B]">
                        {cust.name}
                      </td>
                      <td className="py-3 text-[#65727A]">{cust.store}</td>
                      <td className="py-3 font-800 text-[#0D2B45] tnum">
                        {formatPHP(cust.used)}{" "}
                        <span className="text-[10px] font-500 text-[#65727A]">
                          / {formatPHP(cust.limit)}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#F7F8F6] border border-[#E4E8E6] rounded-full h-2.5 overflow-hidden print:border-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                cust.utilization > 80
                                  ? "bg-red-500"
                                  : cust.utilization > 60
                                    ? "bg-amber-500"
                                    : "bg-[#1E7D3B]"
                              }`}
                              style={{ width: `${cust.utilization}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-700 text-[#65727A] tnum">
                            {cust.utilization}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-700 border ${
                            cust.hasOverdue
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {cust.hasOverdue
                            ? "Overdue Follow-up"
                            : "Current (Good Standing)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Printable Document Footer */}
        <div className="hidden print:flex items-center justify-between pt-4 mt-6 border-t border-slate-300 text-[10px] text-slate-500">
          <div>
            Sari-Fi Micro-Retail & Credit Operations · Confidential Executive
            Summary
          </div>
          <div>
            Generated on {now.toLocaleDateString("en-PH")} at{" "}
            {now.toLocaleTimeString("en-PH")}
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
