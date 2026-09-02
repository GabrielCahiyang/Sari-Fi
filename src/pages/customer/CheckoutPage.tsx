import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import type { Order, Financing, Payment, InstallmentSchedule } from '../../types';
import { saveRecord, updateRecord } from '../../services/firebase/rtdbService';

type Mode = 'cash' | 'gcash' | 'financing' | 'split';

export function CheckoutPage() {
  const { state, dispatch, navigate, getProduct, getCurrentCustomer, showToast, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  const [mode, setMode] = useState<Mode>('cash');
  const [plan, setPlan] = useState<1 | 2>(1);
  const [splitMethod, setSplitMethod] = useState<'cash' | 'gcash'>('cash');
  const [gcashProcessing, setGcashProcessing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const isPlacingRef = useRef(false);

  const items = state.cart.map(item => {
    const p = getProduct(item.productId);
    return p ? { productId: item.productId, productName: p.name, quantity: item.quantity, price: p.sellingPrice } : null;
  }).filter(Boolean) as { productId: string; productName: string; quantity: number; price: number }[];

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const available = customer ? customer.creditLimit - customer.usedCredit : 0;
  const { financingCharge, plan1Installments, plan2Installments } = state.settings;
  const installmentCount = plan === 1 ? plan1Installments : plan2Installments;
  const chargeAmount = Math.round(total * financingCharge / 100);
  const totalRepayable = total + chargeAmount;
  const weeklyInstallment = Math.round(totalRepayable / installmentCount * 100) / 100;

  // Split
  const financingAmount = Math.min(available, total);
  const splitRemainder = total - financingAmount;
  const splitCharge = Math.round(financingAmount * financingCharge / 100);
  const splitTotalRepayable = financingAmount + splitCharge;
  const splitWeekly = Math.round(splitTotalRepayable / installmentCount * 100) / 100;

  const canFinance = available >= total;
  const canSplit = available > 0 && available < total;
  const orderId = `ord${Date.now()}`;
  const finId = `fin${Date.now()}`;

  const generateSchedule = (count: number, amount: number): InstallmentSchedule[] => {
    const today = new Date();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1) * 7);
      return {
        weekNo: i + 1,
        dueDate: d.toISOString().split('T')[0],
        baseAmount: amount,
        penalty: 0,
        status: i === 0 ? 'upcoming' as const : 'upcoming' as const,
      };
    });
  };

  const placeOrder = async () => {
    if (!customer || items.length === 0 || isPlacingRef.current) return;
    isPlacingRef.current = true;
    setPlacing(true);

    const orderBase: Order = {
      id: orderId,
      orderNo: `ORD-${String(state.orders.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      items,
      total,
      paymentType: mode,
      paymentStatus: 'pending',
      status: mode === 'cash' ? 'pending_payment' : mode === 'gcash' ? 'completed' : 'pending_financing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let finalOrder: Order;
    let finalPayment: Payment | undefined;
    let finalFinancing: Financing | undefined;

    if (mode === 'cash') {
      finalPayment = {
        id: `pay${Date.now()}`,
        paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId,
        type: 'purchase',
        method: 'cash',
        amount: total,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      finalOrder = { ...orderBase };
      await new Promise(r => setTimeout(r, 400));
      showToast('success', 'Order placed! Waiting for cash payment confirmation.');
    } else if (mode === 'gcash') {
      setGcashProcessing(true);
      await new Promise(r => setTimeout(r, 1000));
      finalPayment = {
        id: `pay${Date.now()}`,
        paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId,
        type: 'purchase',
        method: 'gcash',
        amount: total,
        status: 'paid',
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      };
      finalOrder = { ...orderBase, status: 'completed' as const, paymentStatus: 'paid' as const };
      showToast('success', 'GCash payment successful! Order is completed.');
    } else if (mode === 'financing') {
      const schedule = generateSchedule(installmentCount, weeklyInstallment);
      finalFinancing = {
        id: finId,
        financingNo: `FIN-${String(state.financing.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId,
        principal: total,
        chargePercent: financingCharge,
        chargeAmount,
        totalRepayable,
        plan,
        installmentCount,
        weeklyInstallment,
        paidPrincipal: 0,
        status: 'pending',
        schedule,
        createdAt: new Date().toISOString(),
      };
      finalOrder = { ...orderBase, financingId: finId, status: 'pending_financing' as const };
      await new Promise(r => setTimeout(r, 400));
      showToast('info', 'Financing request submitted! Awaiting supervisor approval.');
    } else if (mode === 'split') {
      if (splitMethod === 'gcash') {
        setGcashProcessing(true);
        await new Promise(r => setTimeout(r, 1000));
      }
      const schedule = generateSchedule(installmentCount, splitWeekly);
      finalFinancing = {
        id: finId,
        financingNo: `FIN-${String(state.financing.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId,
        principal: financingAmount,
        chargePercent: financingCharge,
        chargeAmount: splitCharge,
        totalRepayable: splitTotalRepayable,
        plan,
        installmentCount,
        weeklyInstallment: splitWeekly,
        paidPrincipal: 0,
        status: 'pending',
        schedule,
        createdAt: new Date().toISOString(),
      };
      finalPayment = {
        id: `pay${Date.now()}`,
        paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId,
        type: 'purchase',
        method: splitMethod,
        amount: splitRemainder,
        status: splitMethod === 'gcash' ? 'paid' : 'pending',
        createdAt: new Date().toISOString(),
        paidAt: splitMethod === 'gcash' ? new Date().toISOString() : undefined,
      };
      finalOrder = { ...orderBase, financingId: finId, status: 'pending_financing' as const, splitCashAmount: splitRemainder, splitFinancingAmount: financingAmount, splitMethod };
      showToast('info', `Split payment processed. ₱${splitRemainder.toLocaleString()} ${splitMethod.toUpperCase()} paid. Financing awaiting approval.`);
    } else {
      finalOrder = { ...orderBase };
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

      // Update customer used credit if financing was used
      if (finalFinancing) {
        const cust = state.customers.find(c => c.id === customer.id);
        if (cust) {
          await updateRecord('customers', cust.id, { usedCredit: cust.usedCredit + finalFinancing.principal });
        }
      }
    } catch (err: any) {
      console.error('Failed to save order to RTDB:', err);
    }

    dispatch({ type: 'PLACE_ORDER', order: finalOrder, payment: finalPayment, financing: finalFinancing });
    setGcashProcessing(false);
    setPlacing(false);
    isPlacingRef.current = false;
    navigate('customer/orders');
  };

  if (gcashProcessing) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-6">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
            <span className="text-blue-600 font-800 text-xl">G</span>
          </div>
          <div className="font-700 text-[#10212B] text-lg mb-2">Processing GCash Payment</div>
          <div className="text-sm text-[#65727A] mb-6">Please wait while we confirm your payment…</div>
          <div className="text-xs text-[#65727A] bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl max-w-sm text-center">
            For prototype purposes, the GCash gateway is simulated using a mocked webhook.
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (items.length === 0) {
    return (
      <CustomerLayout>
        <div className="text-center p-12">
          <p className="text-[#65727A] mb-4">Your cart is empty.</p>
          <button onClick={() => navigate('customer/shop')} className="text-sm text-[#1E7D3B] font-600 hover:underline">← Back to Shop</button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('customer/cart')} className="text-[#65727A] hover:text-[#0D2B45] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-800 text-[#0D2B45]">Checkout</h1>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Payment Mode Selection */}
          <div className="col-span-12 md:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
              <div className="font-700 text-sm text-[#10212B] mb-4">Payment Method</div>
              <div className="space-y-3">
                {/* Pay in Full - Cash */}
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${mode === 'cash' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'}`}>
                  <input type="radio" name="mode" checked={mode === 'cash'} onChange={() => setMode('cash')} className="text-[#1E7D3B]" />
                  <div>
                    <div className="font-600 text-sm text-[#10212B]">Pay in Full — Cash</div>
                    <div className="text-xs text-[#65727A]">Pay at Sari-Fi. Staff confirms cash received.</div>
                  </div>
                </label>
                {/* Pay in Full - GCash */}
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${mode === 'gcash' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'}`}>
                  <input type="radio" name="mode" checked={mode === 'gcash'} onChange={() => setMode('gcash')} className="text-[#1E7D3B]" />
                  <div>
                    <div className="font-600 text-sm text-[#10212B]">Pay in Full — GCash</div>
                    <div className="text-xs text-[#65727A]">Instant mock GCash payment. Auto-confirmed.</div>
                  </div>
                </label>
                {/* Financing */}
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${mode === 'financing' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'} ${!canFinance ? 'opacity-50' : ''}`}>
                  <input type="radio" name="mode" checked={mode === 'financing'} onChange={() => setMode('financing')} disabled={!canFinance} className="text-[#1E7D3B]" />
                  <div className="flex-1">
                    <div className="font-600 text-sm text-[#10212B]">Sari-Fi Financing</div>
                    <div className="text-xs text-[#65727A]">Use revolving credit. Requires supervisor approval.</div>
                    {!canFinance && <div className="text-xs text-amber-600 mt-0.5">Insufficient credit (need {formatPHP(total)}, have {formatPHP(available)})</div>}
                  </div>
                </label>
                {/* Split */}
                {canSplit && (
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${mode === 'split' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'}`}>
                    <input type="radio" name="mode" checked={mode === 'split'} onChange={() => setMode('split')} className="text-[#1E7D3B]" />
                    <div>
                      <div className="font-600 text-sm text-[#10212B]">Split Payment</div>
                      <div className="text-xs text-[#65727A]">Finance {formatPHP(financingAmount)} + pay {formatPHP(splitRemainder)} via Cash/GCash</div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Financing details */}
            {(mode === 'financing' || mode === 'split') && (
              <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5">
                <div className="font-700 text-sm text-[#10212B] mb-4">Financing Plan</div>

                {mode === 'split' && (
                  <div className="bg-[#F7F8F6] rounded-xl p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#65727A]">Financed (credit)</span>
                      <span className="font-700 text-[#10212B]">{formatPHP(financingAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#65727A]">Pay now ({splitMethod.toUpperCase()})</span>
                      <span className="font-700 text-[#10212B]">{formatPHP(splitRemainder)}</span>
                    </div>
                    <div className="border-t border-[#E4E8E6] pt-2 flex justify-between text-sm">
                      <span className="font-700">Cart Total</span>
                      <span className="font-700">{formatPHP(total)}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[1, 2].map(p => (
                    <label key={p} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${plan === p ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6]'}`}>
                      <input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p as 1 | 2)} className="text-[#1E7D3B]" />
                      <div>
                        <div className="font-600 text-sm">{p === 1 ? '1 Month' : '2 Months'}</div>
                        <div className="text-[11px] text-[#65727A]">{p === 1 ? plan1Installments : plan2Installments} weekly payments</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    ['Principal', formatPHP(mode === 'split' ? financingAmount : total)],
                    [`Finance Charge (${financingCharge}%)`, formatPHP(mode === 'split' ? splitCharge : chargeAmount)],
                    ['Total Repayable', formatPHP(mode === 'split' ? splitTotalRepayable : totalRepayable)],
                    ['Weekly Installment', formatPHP(mode === 'split' ? splitWeekly : weeklyInstallment)],
                    ['Number of Payments', `${installmentCount}×`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-[#F7F8F6] pb-2 last:border-0">
                      <span className="text-[#65727A]">{label}</span>
                      <span className="font-700 text-[#10212B]">{value}</span>
                    </div>
                  ))}
                </div>

                {mode === 'split' && (
                  <div className="mt-4">
                    <div className="text-xs font-600 text-[#65727A] mb-2">Pay {formatPHP(splitRemainder)} via:</div>
                    <div className="flex gap-2">
                      {(['cash', 'gcash'] as const).map(m => (
                        <label key={m} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm font-600 ${splitMethod === m ? 'border-[#1E7D3B] bg-[#F0FAF4] text-[#1E7D3B]' : 'border-[#E4E8E6] text-[#65727A]'}`}>
                          <input type="radio" name="splitMethod" checked={splitMethod === m} onChange={() => setSplitMethod(m)} className="sr-only" />
                          {m === 'gcash' ? 'GCash' : 'Cash'}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="col-span-12 md:col-span-5">
            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5 sticky top-4">
              <div className="font-700 text-sm text-[#10212B] mb-4">Order Summary</div>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {items.map(item => (
                  <div key={item.productId} className="flex justify-between text-xs text-[#65727A]">
                    <span className="truncate pr-2">{item.productName} ×{item.quantity}</span>
                    <span className="font-600 shrink-0">{formatPHP(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E4E8E6] pt-3 mb-1">
                <div className="flex justify-between">
                  <span className="font-700 text-[#10212B]">Cart Total</span>
                  <span className="font-800 text-[#0D2B45] text-lg">{formatPHP(total)}</span>
                </div>
              </div>
              <div className="text-xs text-[#65727A] mb-6">
                Mode: <span className="font-600 text-[#10212B] capitalize">{mode === 'split' ? 'Split Payment' : mode === 'financing' ? 'Sari-Fi Financing' : mode === 'gcash' ? 'GCash' : 'Cash'}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all disabled:opacity-60"
              >
                {placing ? 'Placing order…' :
                  mode === 'cash' ? 'Place Order — Pay Cash' :
                  mode === 'gcash' ? 'Place Order — Pay via GCash' :
                  mode === 'financing' ? 'Submit Financing Request' :
                  'Place Order — Split Payment'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
