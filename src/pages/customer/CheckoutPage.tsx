import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import type { Order, Financing, Payment, InstallmentSchedule, OrderItem } from '../../types';
import {
  cancelOrderFlow,
  createOrderWithReservation,
  settleOrderPayment,
} from '../../services/firebase/rtdbService';
import { resolveFinancialOrderStatus } from '../../domain/orderFlow';
import {
  generateMockGcashReference,
  processMockGcashWebhook,
  type MockGcashWebhookPayload,
} from '../../services/payment/mockGcashService';

type Mode = 'cash' | 'gcash' | 'financing' | 'split';

export function CheckoutPage() {
  const { state, dispatch, navigate, getProduct, getCurrentCustomer, showToast, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  const [mode, setMode] = useState<Mode>('cash');
  const [plan, setPlan] = useState<1 | 2>(1);
  const [splitMethod, setSplitMethod] = useState<'cash' | 'gcash'>('cash');
  const [placing, setPlacing] = useState(false);
  const [pendingWebhookData, setPendingWebhookData] = useState<{ order: Order; payment: Payment } | null>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const isPlacingRef = useRef(false);

  const items = state.cart.map(item => {
    const p = getProduct(item.productId);
    return p ? { productId: item.productId, productName: p.name, quantity: item.quantity, price: p.sellingPrice, supplierId: p.supplierId } : null;
  }).filter(Boolean) as OrderItem[];

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
  const supplierIds = new Set(items.map(item => item.supplierId).filter(Boolean));
  const hasSingleSupplier = supplierIds.size === 1;

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
    if (!hasSingleSupplier) {
      showToast('error', 'Please place separate orders for products from different suppliers.');
      return;
    }
    isPlacingRef.current = true;
    setPlacing(true);

    const idSeed = Date.now();
    const orderId = `ord${idSeed}`;
    const finId = `fin${idSeed}`;
    const now = new Date().toISOString();

    const orderBase: Order = {
      id: orderId,
      orderNo: `ORD-${String(state.orders.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      items,
      total,
      paymentType: mode,
      paymentStatus: 'pending',
      status: mode === 'cash' || mode === 'gcash' ? 'pending_payment' : 'pending_financing',
      stockReservationStatus: 'reserved',
      createdAt: now,
      updatedAt: now,
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
        createdAt: now,
      };
      finalOrder = { ...orderBase };
      await new Promise(r => setTimeout(r, 400));
      showToast('success', 'Order placed! Waiting for cash payment confirmation.');
    } else if (mode === 'gcash') {
      const mockRef = generateMockGcashReference();
      finalPayment = {
        id: `pay${Date.now()}`,
        paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId,
        type: 'purchase',
        method: 'gcash',
        amount: total,
        status: 'pending',
        mockTransactionId: mockRef.transactionId,
        referenceId: mockRef.referenceId,
        createdAt: now,
      };
      finalOrder = { ...orderBase, status: 'pending_payment' as const, paymentStatus: 'pending' as const };
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
        createdAt: now,
      };
      finalOrder = { ...orderBase, financingId: finId, status: 'pending_financing' as const };
      await new Promise(r => setTimeout(r, 300));
      showToast('info', 'Financing request submitted! Awaiting supervisor approval.');
    } else if (mode === 'split') {
      const mockRef = splitMethod === 'gcash' ? generateMockGcashReference() : undefined;
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
        createdAt: now,
      };
      finalPayment = {
        id: `pay${Date.now()}`,
        paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId,
        type: 'purchase',
        method: splitMethod,
        amount: splitRemainder,
        status: 'pending',
        mockTransactionId: mockRef?.transactionId,
        referenceId: mockRef?.referenceId,
        createdAt: now,
      };
      finalOrder = { ...orderBase, financingId: finId, status: 'pending_financing' as const, splitCashAmount: splitRemainder, splitFinancingAmount: financingAmount, splitMethod };
      showToast('info', splitMethod === 'gcash'
        ? `Order reserved. Confirm the ${formatPHP(splitRemainder)} GCash callback next.`
        : `Order reserved. ${formatPHP(splitRemainder)} cash and financing are awaiting confirmation.`);
    } else {
      finalOrder = { ...orderBase };
    }

    try {
      await createOrderWithReservation(finalOrder, finalPayment, finalFinancing);
    } catch (err: any) {
      console.error('Failed to reserve order in RTDB:', err);
      setPlacing(false);
      isPlacingRef.current = false;
      showToast('error', err.message || 'Could not reserve this order.');
      return;
    }

    dispatch({ type: 'PLACE_ORDER', order: finalOrder, payment: finalPayment, financing: finalFinancing });

    if ((mode === 'gcash' || (mode === 'split' && splitMethod === 'gcash')) && finalPayment) {
      setPlacing(false);
      isPlacingRef.current = false;
      setPendingWebhookData({ order: finalOrder, payment: finalPayment });
      return;
    }

    setPlacing(false);
    isPlacingRef.current = false;
    navigate('customer/orders');
  };

  const handleSimulateWebhook = async (status: 'SUCCESS' | 'FAILED') => {
    if (!pendingWebhookData) return;
    setSimulatingWebhook(true);

    const { order, payment } = pendingWebhookData;
    const payload: MockGcashWebhookPayload = {
      event: status === 'SUCCESS' ? 'payment.success' : 'payment.failed',
      transactionId: payment.mockTransactionId || `GCASH-TXN-${Date.now()}`,
      referenceId: payment.referenceId || `REF-${Date.now()}`,
      paymentId: payment.id,
      orderId: order.id,
      amount: payment.amount,
      status,
      timestamp: new Date().toISOString(),
    };

    const result = processMockGcashWebhook(payload, payment);

    try {
      if (result.success && result.updatedPayment) {
        await settleOrderPayment(payment.id);
        const nextStatus = resolveFinancialOrderStatus(
          order,
          [...state.payments.filter(p => p.id !== payment.id), result.updatedPayment],
          state.financing,
        );
        dispatch({ type: 'CONFIRM_CASH_PAYMENT', paymentId: payment.id, confirmedBy: 'GCash webhook' });
        showToast('success', nextStatus === 'processing'
          ? 'GCash confirmed. The order is now ready for supplier processing.'
          : 'GCash confirmed. The financing portion is still awaiting approval.');
      } else {
        await cancelOrderFlow(order.id, 'GCash payment failed');
        dispatch({ type: 'CANCEL_ORDER', orderId: order.id, reason: 'GCash payment failed' });
        showToast('error', result.error || 'GCash payment simulation failed.');
      }
      setPendingWebhookData(null);
      navigate('customer/orders');
    } catch (error: any) {
      showToast('error', error.message || 'Could not process the GCash callback.');
    } finally {
      setSimulatingWebhook(false);
    }
  };

  if (pendingWebhookData) {
    const { order, payment } = pendingWebhookData;
    return (
      <CustomerLayout>
        <div className="max-w-md mx-auto my-6 sm:my-12 p-4 sm:p-6 bg-white rounded-3xl border border-[#E4E8E6] shadow-sm text-center">
          <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-sky-600 font-900 text-2xl">G</span>
          </div>
          <h2 className="text-lg font-800 text-[#0D2B45] mb-1">Awaiting GCash Confirmation</h2>
          <p className="text-xs text-[#65727A] mb-5">
            Simulated asynchronous webhook payment gateway for thesis evaluation.
          </p>

          <div className="bg-[#F7F8F6] rounded-2xl p-4 text-left space-y-2 mb-6 text-xs">
            <div className="flex justify-between">
              <span className="text-[#65727A]">Order Number:</span>
              <span className="font-700 text-[#10212B]">{order.orderNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#65727A]">Reference ID:</span>
              <span className="font-700 text-[#10212B] font-mono">{payment.referenceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#65727A]">Transaction ID:</span>
              <span className="font-700 text-[#10212B] font-mono truncate max-w-[150px] sm:max-w-[200px]">{payment.mockTransactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#65727A]">Amount Due:</span>
              <span className="font-700 text-[#1E7D3B] text-sm">{formatPHP(payment.amount)}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => handleSimulateWebhook('SUCCESS')}
              disabled={simulatingWebhook}
              className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-xs rounded-xl hover:bg-[#22913f] transition-all cursor-pointer shadow-sm shadow-[#1E7D3B]/20 disabled:opacity-60"
            >
              {simulatingWebhook ? 'Verifying Webhook…' : 'Simulate Webhook Callback: SUCCESS'}
            </button>
            <button
              onClick={() => handleSimulateWebhook('FAILED')}
              disabled={simulatingWebhook}
              className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 font-700 text-xs rounded-xl hover:bg-red-100 transition-all cursor-pointer disabled:opacity-60"
            >
              Simulate Webhook Callback: FAILED
            </button>
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
      <div className="max-w-5xl mx-auto p-3.5 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <button onClick={() => navigate('customer/cart')} className="text-[#65727A] hover:text-[#0D2B45] transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45]">Checkout</h1>
        </div>

        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          {/* Payment Mode Selection */}
          <div className="col-span-12 md:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5">
              <div className="font-700 text-sm text-[#10212B] mb-4">Payment Method</div>
              <div className="space-y-3">
                {/* Pay in Full - Cash */}
                <label className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${mode === 'cash' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'}`}>
                  <input type="radio" name="mode" checked={mode === 'cash'} onChange={() => setMode('cash')} className="text-[#1E7D3B]" />
                  <div>
                    <div className="font-600 text-sm text-[#10212B]">Pay in Full — Cash</div>
                    <div className="text-xs text-[#65727A]">Pay at Sari-Fi. Staff confirms cash received.</div>
                  </div>
                </label>
                {/* Pay in Full - GCash */}
                <label className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${mode === 'gcash' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'}`}>
                  <input type="radio" name="mode" checked={mode === 'gcash'} onChange={() => setMode('gcash')} className="text-[#1E7D3B]" />
                  <div>
                    <div className="font-600 text-sm text-[#10212B]">Pay in Full — GCash</div>
                    <div className="text-xs text-[#65727A]">Pending until the simulated webhook confirms it.</div>
                  </div>
                </label>
                {/* Financing */}
                <label className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${mode === 'financing' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'} ${!canFinance ? 'opacity-50' : ''}`}>
                  <input type="radio" name="mode" checked={mode === 'financing'} onChange={() => setMode('financing')} disabled={!canFinance} className="text-[#1E7D3B]" />
                  <div className="flex-1">
                    <div className="font-600 text-sm text-[#10212B]">Sari-Fi Financing</div>
                    <div className="text-xs text-[#65727A]">Use revolving credit. Requires supervisor approval.</div>
                    {!canFinance && <div className="text-xs text-amber-600 mt-0.5">Insufficient credit (need {formatPHP(total)}, have {formatPHP(available)})</div>}
                  </div>
                </label>
                {/* Split */}
                {canSplit && (
                  <label className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${mode === 'split' ? 'border-[#1E7D3B] bg-[#F0FAF4]' : 'border-[#E4E8E6] hover:border-[#1E7D3B]/30'}`}>
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
              <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5">
                <div className="font-700 text-sm text-[#10212B] mb-4">Financing Plan</div>

                {mode === 'split' && (
                  <div className="bg-[#F7F8F6] rounded-xl p-3.5 sm:p-4 mb-4 space-y-2">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
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
                disabled={placing || !hasSingleSupplier}
                className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all disabled:opacity-60"
              >
                {placing ? 'Placing order…' :
                  mode === 'cash' ? 'Place Order — Pay Cash' :
                  mode === 'gcash' ? 'Place Order — Pay via GCash' :
                  mode === 'financing' ? 'Submit Financing Request' :
                  'Place Order — Split Payment'
                }
              </button>
              {!hasSingleSupplier && (
                <p className="mt-2 text-center text-xs text-amber-700">
                  This cart contains multiple suppliers. Place one supplier order at a time.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
