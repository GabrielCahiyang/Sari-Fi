import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { GcashWebhookSimulator } from '../../components/payment/GcashWebhookSimulator';
import type { Order, Financing, Payment, InstallmentSchedule, OrderItem } from '../../types';
import {
  createOrdersWithReservations,
  settleOrderPayment,
  type OrderReservationBundle,
} from '../../services/firebase/rtdbService';
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
  const [pendingWebhookData, setPendingWebhookData] = useState<Array<{ order: Order; payment: Payment }> | null>(null);
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
  const supplierGroups = Array.from(items.reduce((groups, item) => {
    const supplierId = item.supplierId || '';
    const current = groups.get(supplierId) || [];
    current.push(item);
    groups.set(supplierId, current);
    return groups;
  }, new Map<string, OrderItem[]>()).entries());

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
    if (customer.status !== 'active') {
      showToast('error', 'This customer account is inactive and cannot place orders.');
      return;
    }
    if (!Number.isFinite(total) || total <= 0 || items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) {
      showToast('error', 'Your cart contains an invalid item quantity or total.');
      return;
    }
    const unavailableItem = items.find(item => {
      const product = getProduct(item.productId);
      return !product || product.status !== 'active' || item.quantity > product.stock;
    });
    if (unavailableItem) {
      showToast('error', `${unavailableItem.productName} is unavailable or no longer has enough stock.`);
      return;
    }
    if (mode === 'financing' && !canFinance) {
      showToast('error', 'Available credit is not enough for this financing request.');
      return;
    }
    if (mode === 'split' && !canSplit) {
      showToast('error', 'Split payment requires some available credit below the order total.');
      return;
    }
    isPlacingRef.current = true;
    setPlacing(true);

    const idSeed = Date.now();
    const checkoutGroupId = `checkout_${idSeed}`;
    const now = new Date().toISOString();
    let remainingFinancing = mode === 'financing' ? total : mode === 'split' ? financingAmount : 0;
    let paymentIndex = 0;
    let financingIndex = 0;
    const bundles: OrderReservationBundle[] = supplierGroups.map(([supplierId, groupItems], index) => {
      const orderId = `ord${idSeed}_${index + 1}`;
      const groupTotal = groupItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const financedAmount = Math.min(remainingFinancing, groupTotal);
      remainingFinancing -= financedAmount;
      const immediateAmount = groupTotal - financedAmount;
      const paymentMethod = mode === 'split' ? splitMethod : mode === 'gcash' ? 'gcash' : 'cash';
      const childPaymentType: Mode = financedAmount > 0 && immediateAmount > 0
        ? 'split'
        : financedAmount > 0
          ? 'financing'
          : paymentMethod;

      let payment: Payment | undefined;
      if (immediateAmount > 0) {
        paymentIndex += 1;
        const mockRef = paymentMethod === 'gcash' ? generateMockGcashReference() : undefined;
        payment = {
          id: `pay${idSeed}_${paymentIndex}`,
          paymentNo: `PAY-${String(state.payments.length + paymentIndex).padStart(4, '0')}`,
          customerId: customer.id,
          orderId,
          type: 'purchase',
          method: paymentMethod,
          amount: immediateAmount,
          status: 'pending',
          mockTransactionId: mockRef?.transactionId,
          referenceId: mockRef?.referenceId,
          createdAt: now,
        };
      }

      let financing: Financing | undefined;
      if (financedAmount > 0) {
        financingIndex += 1;
        const groupCharge = Math.round(financedAmount * financingCharge / 100);
        const groupRepayable = financedAmount + groupCharge;
        const groupWeekly = Math.round(groupRepayable / installmentCount * 100) / 100;
        financing = {
          id: `fin${idSeed}_${financingIndex}`,
          financingNo: `FIN-${String(state.financing.length + financingIndex).padStart(4, '0')}`,
          customerId: customer.id,
          orderId,
          principal: financedAmount,
          chargePercent: financingCharge,
          chargeAmount: groupCharge,
          totalRepayable: groupRepayable,
          plan,
          installmentCount,
          weeklyInstallment: groupWeekly,
          paidPrincipal: 0,
          status: 'pending',
          schedule: generateSchedule(installmentCount, groupWeekly),
          createdAt: now,
        };
      }

      const order: Order = {
        id: orderId,
        orderNo: `ORD-${String(state.orders.length + index + 1).padStart(4, '0')}`,
        checkoutGroupId,
        supplierId,
        customerId: customer.id,
        items: groupItems,
        total: groupTotal,
        paymentType: childPaymentType,
        paymentStatus: 'pending',
        status: financing ? 'pending_financing' : 'pending_payment',
        stockReservationStatus: 'reserved',
        financingId: financing?.id,
        splitCashAmount: childPaymentType === 'split' ? immediateAmount : undefined,
        splitFinancingAmount: childPaymentType === 'split' ? financedAmount : undefined,
        splitMethod: childPaymentType === 'split' ? paymentMethod : undefined,
        createdAt: now,
        updatedAt: now,
      };
      return { order, payment, financing };
    });

    try {
      await createOrdersWithReservations(bundles);
    } catch (err: any) {
      console.error('Failed to reserve order in RTDB:', err);
      setPlacing(false);
      isPlacingRef.current = false;
      showToast('error', err.message || 'Could not reserve this order.');
      return;
    }

    bundles.forEach(bundle => dispatch({ type: 'PLACE_ORDER', ...bundle }));
    const gcashPayments = bundles
      .filter(bundle => bundle.payment?.method === 'gcash')
      .map(bundle => ({ order: bundle.order, payment: bundle.payment! }));

    if (gcashPayments.length > 0) {
      setPlacing(false);
      isPlacingRef.current = false;
      setPendingWebhookData(gcashPayments);
      return;
    }

    setPlacing(false);
    isPlacingRef.current = false;
    showToast(
      mode === 'financing' || mode === 'split' ? 'info' : 'success',
      `${bundles.length} supplier ${bundles.length === 1 ? 'order' : 'orders'} created from this checkout.`,
    );
    navigate('customer/orders');
  };

  const confirmGcashWebhook = async () => {
    if (!pendingWebhookData || pendingWebhookData.length === 0) return;

    try {
      for (const { order, payment } of pendingWebhookData) {
        const payload: MockGcashWebhookPayload = {
          event: 'payment.success',
          transactionId: payment.mockTransactionId || `GCASH-TXN-${Date.now()}`,
          referenceId: payment.referenceId || `REF-${Date.now()}`,
          paymentId: payment.id,
          orderId: order.id,
          amount: payment.amount,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
        };
        const result = processMockGcashWebhook(payload, payment);
        if (!result.success || !result.updatedPayment) throw new Error(result.error || 'GCash callback validation failed.');
        await settleOrderPayment(payment.id);
        dispatch({ type: 'CONFIRM_CASH_PAYMENT', paymentId: payment.id, confirmedBy: 'GCash webhook' });
      }
      showToast('success', `GCash confirmed for ${pendingWebhookData.length} supplier ${pendingWebhookData.length === 1 ? 'order' : 'orders'}.`);
    } catch (error: any) {
      showToast('error', error.message || 'Could not process the GCash callback.');
      throw error;
    }
  };

  if (pendingWebhookData) {
    const totalGcashDue = pendingWebhookData.reduce((sum, entry) => sum + entry.payment.amount, 0);
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-md px-3 py-6 sm:py-12">
          <GcashWebhookSimulator
            amount={formatPHP(totalGcashDue)}
            merchantLabel="Sari-Fi Online Checkout"
            references={pendingWebhookData.map(({ order, payment }) => ({ label: order.orderNo, referenceId: payment.referenceId }))}
            onConfirm={confirmGcashWebhook}
            onFinished={() => {
              setPendingWebhookData(null);
              navigate('customer/orders');
            }}
          />
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
              {supplierGroups.length > 1 && (
                <div className="mb-4 rounded-xl border border-[#DCE8DF] bg-[#F0FAF4] px-3 py-2.5 text-xs text-[#1E7D3B]">
                  <span className="font-800">One checkout, {supplierGroups.length} deliveries.</span> Your cart will be split into one fulfillment order for each supplier.
                </div>
              )}
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
