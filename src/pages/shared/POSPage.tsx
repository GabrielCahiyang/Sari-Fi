import { useMemo, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import type { Order, Financing, Payment, InstallmentSchedule, Customer } from '../../types';
import { saveRecord, updateRecord } from '../../services/firebase/rtdbService';

const CATEGORIES = ['All', 'Beverages', 'Snacks', 'Instant Noodles', 'Canned Goods', 'Condiments', 'Household', 'Personal Care'];
type Mode = 'cash' | 'gcash' | 'financing' | 'split';

export function POSPage() {
  const { state, dispatch, showToast, formatPHP } = useApp();
  const staffName = state.currentUser?.name || 'Staff';

  // POS keeps its own ticket state, fully separate from the customer-facing cart.
  const [lines, setLines] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState<string>('');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [custQuery, setCustQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'catalog' | 'ticket'>('catalog');

  // Checkout state
  const [mode, setMode] = useState<Mode>('cash');
  const [plan, setPlan] = useState<1 | 2>(1);
  const [splitMethod, setSplitMethod] = useState<'cash' | 'gcash'>('gcash');
  const [processing, setProcessing] = useState(false);

  const customer = state.customers.find(c => c.id === customerId);

  const products = state.products.filter(p => p.status === 'active');
  const filtered = products.filter(p =>
    (category === 'All' || p.category === category) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const items = useMemo(() =>
    Object.entries(lines)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => {
        const p = state.products.find(x => x.id === productId)!;
        return { productId, productName: p.name, quantity, price: p.sellingPrice };
      }), [lines, state.products]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const ticketCount = items.reduce((s, i) => s + i.quantity, 0);

  const addLine = (id: string, delta: number) => {
    const prod = state.products.find(p => p.id === id)!;
    setLines(prev => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      const capped = Math.min(next, prod.stock);
      const copy = { ...prev };
      if (capped === 0) delete copy[id]; else copy[id] = capped;
      return copy;
    });
  };
  const setLine = (id: string, q: number) => {
    const prod = state.products.find(p => p.id === id)!;
    setLines(prev => {
      const copy = { ...prev };
      const capped = Math.max(0, Math.min(q, prod.stock));
      if (capped === 0) delete copy[id]; else copy[id] = capped;
      return copy;
    });
  };
  const clearTicket = () => setLines({});

  // ---- Financing / split math (mirrors customer checkout) ----
  const available = customer ? customer.creditLimit - customer.usedCredit : 0;
  const { financingCharge, plan1Installments, plan2Installments } = state.settings;
  const installmentCount = plan === 1 ? plan1Installments : plan2Installments;
  const chargeAmount = Math.round(total * financingCharge / 100);
  const totalRepayable = total + chargeAmount;
  const weeklyInstallment = Math.round(totalRepayable / installmentCount * 100) / 100;

  const financingAmount = Math.min(available, total);
  const splitRemainder = total - financingAmount;
  const splitCharge = Math.round(financingAmount * financingCharge / 100);
  const splitTotalRepayable = financingAmount + splitCharge;
  const splitWeekly = Math.round(splitTotalRepayable / installmentCount * 100) / 100;

  const canFinance = customer && available >= total && total > 0;
  const canSplit = customer && available > 0 && available < total;

  const generateSchedule = (count: number, amount: number): InstallmentSchedule[] => {
    const today = new Date();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1) * 7);
      return { weekNo: i + 1, dueDate: d.toISOString().split('T')[0], baseAmount: amount, penalty: 0, status: 'upcoming' as const };
    });
  };

  const openCheckout = () => {
    if (!customer) { setPickerOpen(true); return; }
    if (items.length === 0) { showToast('info', 'Add products to the ticket first.'); return; }
    setMode('cash');
    setCheckoutOpen(true);
  };

  const isPlacingRef = useRef(false);

  const placeOrder = async () => {
    if (!customer || items.length === 0 || isPlacingRef.current) return;
    isPlacingRef.current = true;
    setProcessing(true);
    const orderId = `ord${Date.now()}`;
    const finId = `fin${Date.now()}`;
    const now = new Date().toISOString();

    const orderBase: Order = {
      id: orderId,
      orderNo: `ORD-${String(state.orders.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      items,
      total,
      paymentType: mode,
      paymentStatus: 'pending',
      status: mode === 'cash' || mode === 'gcash' ? 'completed' : 'pending_financing',
      createdAt: now,
      updatedAt: now,
      channel: 'pos',
      placedBy: staffName,
    };

    if (mode === 'gcash' || (mode === 'split' && splitMethod === 'gcash')) {
      await new Promise(r => setTimeout(r, 600));
    } else {
      await new Promise(r => setTimeout(r, 300));
    }

    let finalOrder: Order;
    let finalPayment: Payment | undefined;
    let finalFinancing: Financing | undefined;

    if (mode === 'cash') {
      finalPayment = {
        id: `pay${Date.now()}`, paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id, orderId, type: 'purchase', method: 'cash', amount: total,
        status: 'paid', confirmedBy: staffName, createdAt: now, paidAt: now,
      };
      // In-store counter cash: paid and completed immediately!
      finalOrder = { ...orderBase, status: 'completed' as const, paymentStatus: 'paid' as const, confirmedBy: staffName };
      showToast('success', `Order ${finalOrder.orderNo} — ${formatPHP(total)} cash collected. Order completed!`);
    } else if (mode === 'gcash') {
      finalPayment = {
        id: `pay${Date.now()}`, paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id, orderId, type: 'purchase', method: 'gcash', amount: total,
        status: 'paid', confirmedBy: staffName, createdAt: now, paidAt: now,
      };
      // In-store counter GCash: paid and completed immediately!
      finalOrder = { ...orderBase, status: 'completed' as const, paymentStatus: 'paid' as const, confirmedBy: staffName };
      showToast('success', `Order ${finalOrder.orderNo} — GCash payment received. Order completed!`);
    } else if (mode === 'financing') {
      finalFinancing = {
        id: finId, financingNo: `FIN-${String(state.financing.length + 1).padStart(4, '0')}`,
        customerId: customer.id, orderId, principal: total, chargePercent: financingCharge,
        chargeAmount, totalRepayable, plan, installmentCount, weeklyInstallment, paidPrincipal: 0,
        status: 'pending', schedule: generateSchedule(installmentCount, weeklyInstallment), createdAt: now,
      };
      finalOrder = { ...orderBase, financingId: finId, status: 'pending_financing' as const };
      showToast('info', `Order ${finalOrder.orderNo} — financing sent for supervisor approval.`);
    } else {
      finalFinancing = {
        id: finId, financingNo: `FIN-${String(state.financing.length + 1).padStart(4, '0')}`,
        customerId: customer.id, orderId, principal: financingAmount, chargePercent: financingCharge,
        chargeAmount: splitCharge, totalRepayable: splitTotalRepayable, plan, installmentCount,
        weeklyInstallment: splitWeekly, paidPrincipal: 0, status: 'pending',
        schedule: generateSchedule(installmentCount, splitWeekly), createdAt: now,
      };
      finalPayment = {
        id: `pay${Date.now()}`, paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id, orderId, type: 'purchase', method: splitMethod, amount: splitRemainder,
        status: 'paid', confirmedBy: splitMethod === 'cash' ? staffName : undefined, createdAt: now, paidAt: now,
      };
      finalOrder = { ...orderBase, financingId: finId, status: 'pending_financing' as const, splitCashAmount: splitRemainder, splitFinancingAmount: financingAmount, splitMethod };
      showToast('info', `Order ${finalOrder.orderNo} — ${formatPHP(splitRemainder)} ${splitMethod.toUpperCase()} paid, ${formatPHP(financingAmount)} financed.`);
    }

    try {
      await saveRecord('orders', finalOrder);
      if (finalPayment) await saveRecord('payments', finalPayment);
      if (finalFinancing) await saveRecord('financing', finalFinancing);

      // Decrement product inventory in RTDB
      for (const item of items) {
        const prod = state.products.find(p => p.id === item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          await updateRecord('products', prod.id, { stock: newStock });
        }
      }

      // INVARIANT: Submitting financing does NOT consume customer credit.
      // Credit is only consumed once supervisor approves the financing.
    } catch (err: any) {
      console.error('Failed to save POS order to RTDB:', err);
    }

    dispatch({ type: 'PLACE_ORDER', order: finalOrder, payment: finalPayment, financing: finalFinancing });

    setProcessing(false);
    isPlacingRef.current = false;
    setCheckoutOpen(false);
    clearTicket();
    setCustomerId('');
    setCustQuery('');
  };

  const customerResults = state.customers.filter(c =>
    custQuery === '' ||
    c.fullName.toLowerCase().includes(custQuery.toLowerCase()) ||
    c.storeName.toLowerCase().includes(custQuery.toLowerCase()) ||
    c.accountNo.toLowerCase().includes(custQuery.toLowerCase())
  );

  const modeLabel = (m: Mode) => m === 'split' ? 'Split Payment' : m === 'financing' ? 'Sari-Fi Financing' : m === 'gcash' ? 'GCash' : 'Cash';

  return (
    <InternalLayout title="Point of Sale">
      {/* Mobile View Toggle */}
      <div className="lg:hidden flex items-center bg-[#E4E8E6] p-1 rounded-xl mb-3">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 text-xs font-700 rounded-lg transition-all cursor-pointer ${
            mobileTab === 'catalog' ? 'bg-white text-[#0D2B45] shadow-xs' : 'text-[#65727A]'
          }`}
        >
          Catalog ({filtered.length})
        </button>
        <button
          onClick={() => setMobileTab('ticket')}
          className={`flex-1 py-2 text-xs font-700 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'ticket' ? 'bg-white text-[#0D2B45] shadow-xs' : 'text-[#65727A]'
          }`}
        >
          <span>Ticket ({ticketCount})</span>
          {ticketCount > 0 && <span className="text-[#1E7D3B]">· {formatPHP(total)}</span>}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-5 h-auto lg:h-[calc(100vh-8.5rem)] relative pb-16 lg:pb-0">
        {/* ---------- Catalog ---------- */}
        <div className={`col-span-12 lg:col-span-8 flex flex-col min-h-0 ${mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Search + categories */}
          <div className="mb-4">
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Scan or search products by name or SKU…"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-600 transition-all border cursor-pointer ${
                    category === cat ? 'bg-[#0D2B45] text-white border-[#0D2B45]' : 'bg-white text-[#65727A] border-[#E4E8E6] hover:border-[#0D2B45]/30 hover:text-[#0D2B45]'
                  }`}
                >{cat}</button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 stagger">
                {filtered.map(product => {
                  const qty = lines[product.id] || 0;
                  const out = product.stock <= 0;
                  return (
                    <button
                      key={product.id}
                      disabled={out}
                      onClick={() => addLine(product.id, 1)}
                      className={`text-left bg-white rounded-2xl border p-3.5 flex flex-col transition-all card-lift cursor-pointer ${
                        qty > 0 ? 'border-[#1E7D3B] ring-2 ring-[#1E7D3B]/15' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/40'
                      } ${out ? 'opacity-45 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-700 text-[#65727A] uppercase tracking-wider truncate">{product.category}</span>
                        {qty > 0 && <span className="shrink-0 bg-[#1E7D3B] text-white text-[11px] font-800 min-w-[20px] h-5 px-1 inline-flex items-center justify-center rounded-lg tnum">{qty}</span>}
                      </div>
                      <div className="font-700 text-sm text-[#10212B] leading-tight mb-1 flex-1 line-clamp-2">{product.name}</div>
                      <div className="text-base sm:text-lg font-800 text-[#0D2B45] tnum">{formatPHP(product.sellingPrice)}</div>
                      <div className={`text-[11px] font-600 mt-0.5 ${out ? 'text-red-500' : product.stock <= product.reorderLevel ? 'text-amber-600' : 'text-[#65727A]'}`}>
                        {out ? 'Out of stock' : `${product.stock} in stock`}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-[#65727A]">
                <div className="font-700 text-[#10212B]">No products found</div>
                <div className="text-sm mt-1">Try a different category or search term.</div>
              </div>
            )}
          </div>

          {/* Mobile Floating Cart Summary */}
          {ticketCount > 0 && (
            <div className="lg:hidden fixed bottom-4 inset-x-4 z-20">
              <button
                onClick={() => setMobileTab('ticket')}
                className="w-full py-3.5 px-5 bg-[#0D2B45] text-white rounded-2xl shadow-xl flex items-center justify-between font-700 text-sm cursor-pointer"
              >
                <span>{ticketCount} {ticketCount === 1 ? 'item' : 'items'} · {formatPHP(total)}</span>
                <span className="flex items-center gap-1 text-[#7DBE4C]">View Ticket →</span>
              </button>
            </div>
          )}
        </div>

        {/* ---------- Ticket ---------- */}
        <div className={`col-span-12 lg:col-span-4 flex flex-col min-h-0 bg-white rounded-2xl border border-[#E4E8E6] shadow-soft-md overflow-hidden ${mobileTab === 'ticket' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Customer selector */}
          <div className="p-4 border-b border-[#E4E8E6] bg-gradient-to-br from-[#0D2B45] to-[#0a2237]">
            {customer ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E7D3B] flex items-center justify-center text-white font-800 shrink-0">{customer.fullName.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-700 text-sm truncate">{customer.fullName}</div>
                  <div className="text-white/60 text-[11px] truncate">{customer.storeName} · {formatPHP(available)} credit</div>
                </div>
                <button onClick={() => setPickerOpen(true)} className="text-[11px] font-600 text-[#7DBE4C] hover:text-white transition-colors shrink-0">Change</button>
              </div>
            ) : (
              <button onClick={() => setPickerOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/25 text-white/80 hover:bg-white/5 hover:text-white text-sm font-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Select customer account
              </button>
            )}
          </div>

          {/* Line items */}
          <div className="flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#65727A] px-6">
                <svg className="w-10 h-10 mb-3 text-[#E4E8E6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <div className="font-600 text-sm text-[#10212B]">Ticket is empty</div>
                <div className="text-xs mt-1">Tap products to ring them up.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 bg-[#F7F8F6] rounded-xl p-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-700 text-[#10212B] truncate">{item.productName}</div>
                      <div className="text-[11px] text-[#65727A] tnum">{formatPHP(item.price)} · {formatPHP(item.price * item.quantity)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => addLine(item.productId, -1)} className="w-7 h-7 rounded-lg bg-white border border-[#E4E8E6] flex items-center justify-center text-[#65727A] hover:text-[#0D2B45] hover:border-[#0D2B45] transition-all font-700">−</button>
                      <input
                        value={item.quantity}
                        onChange={e => setLine(item.productId, parseInt(e.target.value) || 0)}
                        className="w-9 text-center text-sm font-700 tnum bg-white border border-[#E4E8E6] rounded-lg py-1 focus:outline-none focus:border-[#1E7D3B]"
                      />
                      <button onClick={() => addLine(item.productId, 1)} className="w-7 h-7 rounded-lg bg-white border border-[#E4E8E6] flex items-center justify-center text-[#65727A] hover:text-[#0D2B45] hover:border-[#0D2B45] transition-all font-700">+</button>
                    </div>
                  </div>
                ))}
                <button onClick={clearTicket} className="text-[11px] text-red-500 font-600 hover:underline pt-1">Clear ticket</button>
              </div>
            )}
          </div>

          {/* Totals + checkout */}
          <div className="p-4 border-t border-[#E4E8E6] bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-[#65727A]">{ticketCount} item{ticketCount !== 1 ? 's' : ''}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-[#65727A]">Total</span>
                <span className="text-2xl font-800 text-[#0D2B45] tnum">{formatPHP(total)}</span>
              </div>
            </div>
            <button
              onClick={openCheckout}
              disabled={items.length === 0}
              className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {customer ? 'Charge to account →' : 'Select customer to continue'}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Customer picker ---------- */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Charge order to account" size="md">
        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input autoFocus value={custQuery} onChange={e => setCustQuery(e.target.value)} placeholder="Search name, store, or account no.…" className="w-full pl-10 pr-4 py-3 bg-[#F7F8F6] border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:border-[#1E7D3B]" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1.5">
          {customerResults.map((c: Customer) => {
            const avail = c.creditLimit - c.usedCredit;
            return (
              <button
                key={c.id}
                onClick={() => { setCustomerId(c.id); setPickerOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${customerId === c.id ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/40 hover:bg-[#F7F8F6]'}`}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a3d5c] to-[#0D2B45] flex items-center justify-center text-white font-700 text-sm shrink-0">{c.fullName.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-700 text-[#10212B] truncate">{c.fullName}</div>
                  <div className="text-[11px] text-[#65727A] truncate">{c.storeName} · {c.accountNo}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-[#65727A]">Credit</div>
                  <div className="text-xs font-700 text-[#1E7D3B] tnum">{formatPHP(avail)}</div>
                </div>
                {c.status !== 'active' && <Badge variant="red" size="sm">Suspended</Badge>}
              </button>
            );
          })}
          {customerResults.length === 0 && <div className="text-center py-10 text-sm text-[#65727A]">No matching accounts.</div>}
        </div>
      </Modal>

      {/* ---------- Checkout ---------- */}
      <Modal open={checkoutOpen} onClose={() => !processing && setCheckoutOpen(false)} title="Checkout" size="lg">
        {customer && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F7F8F6] rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1E7D3B] flex items-center justify-center text-white font-800 text-sm shrink-0">{customer.fullName.charAt(0)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-700 text-[#10212B] truncate">{customer.fullName}</div>
                  <div className="text-[11px] text-[#65727A] truncate">{customer.storeName} · {formatPHP(available)} credit</div>
                </div>
              </div>
              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E4E8E6] flex sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                <div className="text-[11px] text-[#65727A]">{ticketCount} items</div>
                <div className="text-lg sm:text-xl font-800 text-[#0D2B45] tnum">{formatPHP(total)}</div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="space-y-2.5">
              {[
                { m: 'cash' as const, title: 'Cash', desc: 'Collected at the counter now — auto-confirmed.', on: true },
                { m: 'gcash' as const, title: 'GCash', desc: 'Instant mock GCash payment.', on: true },
                { m: 'financing' as const, title: 'Sari-Fi Financing', desc: 'Charge to revolving credit. Needs supervisor approval.', on: canFinance,
                  note: !canFinance ? `Insufficient credit (need ${formatPHP(total)}, has ${formatPHP(available)})` : undefined },
                ...(canSplit ? [{ m: 'split' as const, title: 'Split Payment', desc: `Finance ${formatPHP(financingAmount)} + collect ${formatPHP(splitRemainder)}`, on: true }] : []),
              ].map(opt => (
                <label key={opt.m} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${mode === opt.m ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'} ${!opt.on ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input type="radio" name="posmode" checked={mode === opt.m} disabled={!opt.on} onChange={() => setMode(opt.m)} className="text-[#1E7D3B]" />
                  <div className="flex-1">
                    <div className="font-600 text-sm text-[#10212B]">{opt.title}</div>
                    <div className="text-xs text-[#65727A]">{opt.desc}</div>
                    {opt.note && <div className="text-xs text-amber-600 mt-0.5">{opt.note}</div>}
                  </div>
                </label>
              ))}
            </div>

            {/* Financing plan */}
            {(mode === 'financing' || mode === 'split') && (
              <div className="bg-[#F7F8F6] rounded-xl p-4">
                <div className="font-700 text-xs text-[#10212B] uppercase tracking-wider mb-3">Financing Plan</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {[1, 2].map(p => (
                    <label key={p} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${plan === p ? 'border-[#1E7D3B] bg-white' : 'border-[#E4E8E6] bg-white'}`}>
                      <input type="radio" name="posplan" checked={plan === p} onChange={() => setPlan(p as 1 | 2)} className="text-[#1E7D3B]" />
                      <div>
                        <div className="font-600 text-sm">{p === 1 ? '1 Month' : '2 Months'}</div>
                        <div className="text-[11px] text-[#65727A]">{p === 1 ? plan1Installments : plan2Installments} weekly payments</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5 text-sm">
                  {[
                    ['Principal', formatPHP(mode === 'split' ? financingAmount : total)],
                    [`Finance Charge (${financingCharge}%)`, formatPHP(mode === 'split' ? splitCharge : chargeAmount)],
                    ['Total Repayable', formatPHP(mode === 'split' ? splitTotalRepayable : totalRepayable)],
                    ['Weekly Installment', formatPHP(mode === 'split' ? splitWeekly : weeklyInstallment)],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-[#65727A]">{l}</span>
                      <span className="font-700 text-[#10212B] tnum">{v}</span>
                    </div>
                  ))}
                </div>
                {mode === 'split' && (
                  <div className="mt-3">
                    <div className="text-xs font-600 text-[#65727A] mb-2">Collect {formatPHP(splitRemainder)} via:</div>
                    <div className="flex gap-2">
                      {(['cash', 'gcash'] as const).map(m => (
                        <label key={m} className={`flex-1 text-center px-3 py-2 rounded-xl border cursor-pointer text-sm font-600 transition-all ${splitMethod === m ? 'border-[#1E7D3B] bg-white text-[#1E7D3B]' : 'border-[#E4E8E6] bg-white text-[#65727A]'}`}>
                          <input type="radio" name="possplit" checked={splitMethod === m} onChange={() => setSplitMethod(m)} className="sr-only" />
                          {m === 'gcash' ? 'GCash' : 'Cash'}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={placeOrder}
              disabled={processing}
              className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all disabled:opacity-60"
            >
              {processing ? 'Processing…' :
                mode === 'cash' ? `Collect ${formatPHP(total)} Cash` :
                mode === 'gcash' ? `Charge ${formatPHP(total)} via GCash` :
                mode === 'financing' ? 'Submit for Financing' :
                `Take ${formatPHP(splitRemainder)} ${splitMethod.toUpperCase()} + Finance`}
            </button>
            <div className="text-center text-[11px] text-[#65727A]">Ringing up as <span className="font-600 text-[#10212B]">{modeLabel(mode)}</span> · Cashier: {staffName}</div>
          </div>
        )}
      </Modal>
    </InternalLayout>
  );
}
