import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { FinancingStatusBadge, InstallmentStatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { GcashWebhookSimulator } from '../../components/payment/GcashWebhookSimulator';
import { saveRecord, settleOrderPayment } from '../../services/firebase/rtdbService';
import { generateMockGcashReference } from '../../services/payment/mockGcashService';
import type { Payment } from '../../types';

export function FinancingPage() {
  const { state, dispatch, getCurrentCustomer, getCustomerFinancing, showToast, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  const financing = getCustomerFinancing(customer?.id || '').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [selectedFin, setSelectedFin] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'gcash'>('gcash');
  const [payWeekNo, setPayWeekNo] = useState<number | null>(null);
  const [payFull, setPayFull] = useState(false);
  const [gcashProcessing, setGcashProcessing] = useState(false);
  const [pendingGcashPayment, setPendingGcashPayment] = useState<Payment | null>(null);

  if (!customer) return null;

  const available = customer.creditLimit - customer.usedCredit;
  const activeFinancing = financing.filter(f => f.status === 'active' || f.status === 'overdue');
  const totalOutstanding = activeFinancing.reduce((s, f) => s + (f.totalRepayable - (f.paidPrincipal / f.principal * f.totalRepayable)), 0);

  const doPayInstallment = async () => {
    if (!selectedFin || payWeekNo === null) return;
    const targetFin = state.financing.find(f => f.id === selectedFin);
    if (!targetFin) return;

    const inst = targetFin.schedule.find(s => s.weekNo === payWeekNo);
    // Defensive Guard / Idempotency: cannot pay an already-paid installment
    if (!inst || inst.status === 'paid') {
      showToast('info', `Installment #${payWeekNo} is already paid.`);
      setPayWeekNo(null);
      setSelectedFin(null);
      return;
    }

    const existingRequest = state.payments.find(payment =>
      payment.financingId === targetFin.id
      && payment.status === 'pending'
      && (payment.type === 'full_settlement'
        || (payment.type === 'installment' && payment.installmentWeekNo === payWeekNo))
    );
    if (existingRequest) {
      showToast('info', existingRequest.method === 'cash'
        ? 'This cash repayment is already waiting for supervisor confirmation.'
        : 'This repayment is already being processed.');
      setPayWeekNo(null);
      setSelectedFin(null);
      return;
    }

    const gcashReference = payMethod === 'gcash' ? generateMockGcashReference() : undefined;
    const newPayment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      paymentNo: `PAY-${Date.now().toString().slice(-8)}`,
      customerId: targetFin.customerId,
      financingId: targetFin.id,
      installmentWeekNo: payWeekNo,
      type: 'installment',
      method: payMethod,
      amount: inst.baseAmount + inst.penalty,
      status: 'pending',
      mockTransactionId: gcashReference?.transactionId,
      referenceId: gcashReference?.referenceId,
      createdAt: new Date().toISOString(),
    };

    try {
      if (payMethod === 'gcash') setGcashProcessing(true);
      await saveRecord('payments', newPayment);
      dispatch({ type: 'ADD_PAYMENT', payment: newPayment });

      if (payMethod === 'cash') {
        showToast('success', `Cash payment request submitted. Installment #${payWeekNo} remains due until a supervisor confirms receipt.`);
        setPayWeekNo(null);
        setSelectedFin(null);
      } else {
        setPendingGcashPayment(newPayment);
      }
    } catch (err: any) {
      console.error('Failed to save installment payment to RTDB:', err);
      showToast('error', 'Payment could not be submitted: ' + (err?.message || 'Please try again.'));
      setGcashProcessing(false);
    }
  };

  const doPayFull = async () => {
    if (!selectedFin) return;
    const targetFin = state.financing.find(f => f.id === selectedFin);
    // Defensive Guard / Idempotency: cannot settle already completed financing
    if (!targetFin || targetFin.status === 'completed') {
      showToast('info', 'This financing plan is already settled.');
      setPayFull(false);
      setSelectedFin(null);
      return;
    }

    const existingRequest = state.payments.find(payment =>
      payment.financingId === targetFin.id
      && payment.status === 'pending'
      && (payment.type === 'installment' || payment.type === 'full_settlement')
    );
    if (existingRequest) {
      showToast('info', existingRequest.method === 'cash'
        ? 'A cash repayment is already waiting for supervisor confirmation.'
        : 'A repayment is already being processed.');
      setPayFull(false);
      setSelectedFin(null);
      return;
    }

    const remaining = targetFin.totalRepayable - (targetFin.paidPrincipal / targetFin.principal * targetFin.totalRepayable);

    const gcashReference = payMethod === 'gcash' ? generateMockGcashReference() : undefined;
    const newPayment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      paymentNo: `PAY-${Date.now().toString().slice(-8)}`,
      customerId: targetFin.customerId,
      financingId: targetFin.id,
      type: 'full_settlement',
      method: payMethod,
      amount: Math.round(remaining * 100) / 100,
      status: 'pending',
      mockTransactionId: gcashReference?.transactionId,
      referenceId: gcashReference?.referenceId,
      createdAt: new Date().toISOString(),
    };

    try {
      if (payMethod === 'gcash') setGcashProcessing(true);
      await saveRecord('payments', newPayment);
      dispatch({ type: 'ADD_PAYMENT', payment: newPayment });

      if (payMethod === 'cash') {
        showToast('success', 'Cash settlement request submitted. The balance remains open until a supervisor confirms receipt.');
        setPayFull(false);
        setSelectedFin(null);
      } else {
        setPendingGcashPayment(newPayment);
      }
    } catch (err: any) {
      console.error('Failed to save full settlement to RTDB:', err);
      showToast('error', 'Payment could not be submitted: ' + (err?.message || 'Please try again.'));
      setGcashProcessing(false);
    }
  };

  const confirmFinancingGcash = async () => {
    if (!pendingGcashPayment) throw new Error('GCash payment request is missing.');
    await settleOrderPayment(pendingGcashPayment.id, 'GCash webhook');
    dispatch({ type: 'CONFIRM_CASH_PAYMENT', paymentId: pendingGcashPayment.id, confirmedBy: 'GCash webhook' });
    showToast(
      'success',
      pendingGcashPayment.type === 'installment'
        ? `Installment #${pendingGcashPayment.installmentWeekNo} paid via GCash. Credit restored.`
        : 'Full balance settled via GCash. Credit restored and financing completed.',
    );
  };

  const finishFinancingGcash = () => {
    const paymentType = pendingGcashPayment?.type;
    setPendingGcashPayment(null);
    setGcashProcessing(false);
    setSelectedFin(null);
    if (paymentType === 'installment') setPayWeekNo(null);
    if (paymentType === 'full_settlement') setPayFull(false);
  };

  const fin = financing.find(f => f.id === selectedFin);

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto p-3.5 sm:p-6">
        {/* Header Bento */}
        <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] mb-4 sm:mb-5">My Financing</h1>

        <div className="grid grid-cols-12 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="col-span-6 md:col-span-3 bg-[#1E7D3B] rounded-2xl p-3.5 sm:p-4">
            <div className="text-white/70 text-[11px] sm:text-xs font-600 uppercase tracking-wider">Available Credit</div>
            <div className="text-white font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(available)}</div>
          </div>
          <div className="col-span-6 md:col-span-3 bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E8E6]">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Credit Limit</div>
            <div className="text-[#0D2B45] font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(customer.creditLimit)}</div>
          </div>
          <div className="col-span-6 md:col-span-3 bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E8E6]">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Used Credit</div>
            <div className="text-[#10212B] font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(customer.usedCredit)}</div>
          </div>
          <div className="col-span-6 md:col-span-3 bg-[#FFF8E1] rounded-2xl p-3.5 sm:p-4 border border-[#FFC107]/30">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Outstanding</div>
            <div className="text-[#10212B] font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(Math.round(totalOutstanding))}</div>
          </div>
        </div>

        {/* Financing list */}
        <div className="space-y-4">
          {financing.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E4E8E6]">
              <div className="text-3xl mb-3">💳</div>
              <div className="font-700 text-[#10212B] mb-1">No financing yet</div>
              <div className="text-sm text-[#65727A]">Use Sari-Fi Financing at checkout to get started.</div>
            </div>
          ) : (
            financing.map(fin => {
              const paidInstallments = fin.schedule.filter(s => s.status === 'paid').length;
              const progress = paidInstallments / fin.installmentCount;
              const remaining = Math.round(fin.totalRepayable - (fin.paidPrincipal / fin.principal * fin.totalRepayable));
              const nextDue = fin.schedule.find(s => s.status === 'due' || s.status === 'overdue');
              const pendingCashRepayments = state.payments.filter(payment =>
                payment.financingId === fin.id
                && payment.method === 'cash'
                && payment.status === 'pending'
                && (payment.type === 'installment' || payment.type === 'full_settlement')
              );
              const pendingNextInstallment = pendingCashRepayments.some(payment =>
                payment.type === 'installment' && payment.installmentWeekNo === nextDue?.weekNo
              );
              const pendingFullSettlement = pendingCashRepayments.some(payment => payment.type === 'full_settlement');
              const hasPendingCashRepayment = pendingCashRepayments.length > 0;
              return (
                <div
                  key={fin.id}
                  data-tour-target={fin.id === 'fin_tour_001' ? '5' : undefined}
                  className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="font-800 text-base text-[#10212B]">{fin.financingNo}</div>
                        <div className="text-xs text-[#65727A] mt-0.5">
                          {fin.plan}-Month Plan · {fin.installmentCount} installments of {formatPHP(fin.weeklyInstallment)}
                        </div>
                      </div>
                      <FinancingStatusBadge status={fin.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 bg-[#F7F8F6] p-3 rounded-xl">
                      <div>
                        <div className="text-[10px] sm:text-xs text-[#65727A]">Principal</div>
                        <div className="font-700 text-xs sm:text-sm text-[#10212B] truncate">{formatPHP(fin.principal)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs text-[#65727A]">Repayable</div>
                        <div className="font-700 text-xs sm:text-sm text-[#10212B] truncate">{formatPHP(fin.totalRepayable)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs text-[#65727A]">Remaining</div>
                        <div className={`font-700 text-xs sm:text-sm truncate ${remaining > 0 ? 'text-[#10212B]' : 'text-[#1E7D3B]'}`}>{remaining > 0 ? formatPHP(remaining) : 'Fully Paid'}</div>
                      </div>
                    </div>

                    {fin.status !== 'pending' && fin.status !== 'rejected' && (
                      <>
                        <div className="bg-[#F7F8F6] rounded-full h-2 mb-1">
                          <div className="bg-[#7DBE4C] h-2 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                        </div>
                        <div className="text-xs text-[#65727A] mb-4">{paidInstallments} of {fin.installmentCount} installments paid</div>
                      </>
                    )}

                    {fin.status === 'pending' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                        Awaiting supervisor approval. Order will process once approved.
                      </div>
                    )}

                    {hasPendingCashRepayment && (
                      <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        <span>
                          Cash {pendingFullSettlement ? 'full settlement' : `installment #${pendingCashRepayments[0]?.installmentWeekNo}`} submitted. Your balance and credit will update only after a supervisor confirms receipt.
                        </span>
                      </div>
                    )}

                    {(fin.status === 'active' || fin.status === 'overdue') && nextDue && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="text-xs sm:text-sm">
                          <span className="text-[#65727A]">Next due: </span>
                          <span className="font-700 text-[#10212B]">{formatPHP(nextDue.baseAmount + nextDue.penalty)}</span>
                          <span className="text-[#65727A]"> on {new Date(nextDue.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                          {nextDue.penalty > 0 && <span className="text-red-500 text-xs ml-1">(+{formatPHP(nextDue.penalty)} penalty)</span>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedFin(fin.id); setPayWeekNo(nextDue.weekNo); }}
                            disabled={hasPendingCashRepayment}
                            className="flex-1 sm:flex-initial px-3 py-2 bg-[#1E7D3B] text-white text-xs font-600 rounded-xl hover:bg-[#22913f] transition-all cursor-pointer text-center disabled:bg-[#E4E8E6] disabled:text-[#65727A] disabled:cursor-not-allowed"
                          >
                            {pendingNextInstallment ? 'Supervisor Confirmation Pending' : 'Pay Installment'}
                          </button>
                          <button
                            data-tour-target={fin.id === 'fin_tour_001' ? '6' : undefined}
                            onClick={() => { setSelectedFin(fin.id); setPayFull(true); }}
                            disabled={hasPendingCashRepayment}
                            className="flex-1 sm:flex-initial px-3 py-2 bg-[#0D2B45] text-white text-xs font-600 rounded-xl hover:bg-[#1a3d5c] transition-all cursor-pointer text-center disabled:bg-[#E4E8E6] disabled:text-[#65727A] disabled:cursor-not-allowed"
                          >
                            {pendingFullSettlement ? 'Supervisor Confirmation Pending' : 'Pay Full Balance'}
                          </button>
                        </div>
                      </div>
                    )}

                    {fin.status === 'completed' && (
                      <div className="text-xs text-[#1E7D3B] font-600">✓ Fully repaid — credit limit may have increased.</div>
                    )}
                  </div>

                  {/* Schedule */}
                  {fin.status !== 'pending' && fin.status !== 'rejected' && (
                    <div className="border-t border-[#F7F8F6] px-5 pb-4">
                      <div className="text-xs font-700 text-[#65727A] uppercase tracking-wider mt-4 mb-3">Repayment Schedule</div>
                      <div className="space-y-2">
                        {fin.schedule.map(s => {
                          const cashPending = pendingCashRepayments.some(payment =>
                            payment.type === 'installment' && payment.installmentWeekNo === s.weekNo
                          );
                          return (
                          <div key={s.weekNo} className="flex items-center justify-between py-1.5 border-b border-[#F7F8F6] last:border-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-700 ${s.status === 'paid' ? 'bg-[#1E7D3B] text-white' : s.status === 'due' ? 'bg-[#FFC107] text-[#0D2B45]' : s.status === 'overdue' ? 'bg-red-500 text-white' : 'bg-[#F7F8F6] text-[#65727A]'}`}>
                                {s.weekNo}
                              </div>
                              <div>
                                <div className="text-xs font-600 text-[#10212B]">Week {s.weekNo}</div>
                                <div className="text-[11px] text-[#65727A]">Due {new Date(s.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-700 text-[#10212B]">{formatPHP(s.baseAmount + s.penalty)}</div>
                                {s.penalty > 0 && <div className="text-[10px] text-red-500">+{formatPHP(s.penalty)} penalty</div>}
                              </div>
                              <InstallmentStatusBadge status={s.status} />
                              {cashPending && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-700 text-amber-700">
                                  Cash pending
                                </span>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pay Installment Modal */}
      <Modal open={payWeekNo !== null && selectedFin !== null} onClose={() => { if (!gcashProcessing) { setPayWeekNo(null); setSelectedFin(null); } }} title={gcashProcessing ? 'GCash Payment Verification' : 'Pay Installment'} size="sm" dismissible={!gcashProcessing}>
        {fin && payWeekNo !== null && (() => {
          const s = fin.schedule.find(i => i.weekNo === payWeekNo);
          if (!s) return null;
          if (gcashProcessing && pendingGcashPayment?.type === 'installment') {
            return (
              <GcashWebhookSimulator
                amount={formatPHP(pendingGcashPayment.amount)}
                merchantLabel="Sari-Fi Financing"
                references={[{ label: `${fin.financingNo} · Week ${payWeekNo}`, referenceId: pendingGcashPayment.referenceId }]}
                onConfirm={confirmFinancingGcash}
                onFinished={finishFinancingGcash}
              />
            );
          }
          return (
            <div className="space-y-4">
              <div className="bg-[#F7F8F6] rounded-xl p-4">
                <div className="text-xs text-[#65727A] mb-1">Amount Due</div>
                <div className="text-2xl font-800 text-[#10212B]">{formatPHP(s.baseAmount + s.penalty)}</div>
                {s.penalty > 0 && <div className="text-xs text-red-500 mt-0.5">Includes {formatPHP(s.penalty)} overdue penalty</div>}
                <div className="text-xs text-[#65727A] mt-1">Week {s.weekNo} of {fin.installmentCount}</div>
              </div>
              <div>
                <div className="text-xs font-600 text-[#65727A] mb-2">Payment Method</div>
                <div className="flex gap-2">
                  {(['gcash', 'cash'] as const).map(m => (
                    <label key={m} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm font-600 transition-all ${payMethod === m ? 'border-[#1E7D3B] bg-[#F0FAF4] text-[#1E7D3B]' : 'border-[#E4E8E6] text-[#65727A]'}`}>
                      <input type="radio" name="pm" checked={payMethod === m} onChange={() => setPayMethod(m)} className="sr-only" />
                      {m === 'gcash' ? 'GCash (instant)' : 'Cash (supervisor confirms)'}
                    </label>
                  ))}
                </div>
              </div>
              {payMethod === 'cash' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                  Submitting cash creates a pending request. This installment stays unpaid and no credit is restored until a supervisor confirms the cash was received.
                </div>
              )}
              <button
                onClick={doPayInstallment}
                disabled={gcashProcessing}
                className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all disabled:opacity-60"
              >
                {gcashProcessing
                  ? 'Processing…'
                  : payMethod === 'cash'
                    ? `Submit Cash Request — ${formatPHP(s.baseAmount + s.penalty)}`
                    : `Pay ${formatPHP(s.baseAmount + s.penalty)} via GCash`}
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* Pay Full Balance Modal */}
      <Modal open={payFull && selectedFin !== null} onClose={() => { if (!gcashProcessing) { setPayFull(false); setSelectedFin(null); } }} title={gcashProcessing ? 'GCash Payment Verification' : 'Pay Full Balance'} size="sm" dismissible={!gcashProcessing}>
        {fin && (() => {
          const remaining = Math.round(fin.totalRepayable - (fin.paidPrincipal / fin.principal * fin.totalRepayable));
          if (gcashProcessing && pendingGcashPayment?.type === 'full_settlement') {
            return (
              <GcashWebhookSimulator
                amount={formatPHP(pendingGcashPayment.amount)}
                merchantLabel="Sari-Fi Financing"
                references={[{ label: `${fin.financingNo} · Full settlement`, referenceId: pendingGcashPayment.referenceId }]}
                onConfirm={confirmFinancingGcash}
                onFinished={finishFinancingGcash}
              />
            );
          }
          return (
            <div className="space-y-4">
              <div className="bg-[#F7F8F6] rounded-xl p-4">
                <div className="text-xs text-[#65727A] mb-1">Full Balance to Settle</div>
                <div className="text-2xl font-800 text-[#10212B]">{formatPHP(remaining)}</div>
                <div className="text-xs text-[#1E7D3B] mt-1">All remaining installments will be cleared</div>
              </div>
              <div>
                <div className="text-xs font-600 text-[#65727A] mb-2">Payment Method</div>
                <div className="flex gap-2">
                  {(['gcash', 'cash'] as const).map(m => (
                    <label key={m} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm font-600 transition-all ${payMethod === m ? 'border-[#1E7D3B] bg-[#F0FAF4] text-[#1E7D3B]' : 'border-[#E4E8E6] text-[#65727A]'}`}>
                      <input type="radio" name="pm2" checked={payMethod === m} onChange={() => setPayMethod(m)} className="sr-only" />
                      {m === 'gcash' ? 'GCash (instant)' : 'Cash (supervisor confirms)'}
                    </label>
                  ))}
                </div>
              </div>
              {payMethod === 'cash' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                  Your financing remains active until a supervisor confirms receiving the full cash settlement.
                </div>
              )}
              <button
                onClick={doPayFull}
                disabled={gcashProcessing}
                className="w-full py-3 bg-[#0D2B45] text-white font-700 text-sm rounded-xl hover:bg-[#1a3d5c] transition-all disabled:opacity-60"
              >
                {gcashProcessing
                  ? 'Processing…'
                  : payMethod === 'cash'
                    ? `Submit Cash Settlement — ${formatPHP(remaining)}`
                    : `Settle Full Balance — ${formatPHP(remaining)}`}
              </button>
            </div>
          );
        })()}
      </Modal>
    </CustomerLayout>
  );
}
