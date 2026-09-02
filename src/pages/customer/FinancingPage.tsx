import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { FinancingStatusBadge, InstallmentStatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { saveRecord, updateRecord } from '../../services/firebase/rtdbService';
import type { Financing, Payment } from '../../types';

export function FinancingPage() {
  const { state, dispatch, getCurrentCustomer, getCustomerFinancing, showToast, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  const financing = getCustomerFinancing(customer?.id || '').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [selectedFin, setSelectedFin] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'gcash'>('gcash');
  const [payWeekNo, setPayWeekNo] = useState<number | null>(null);
  const [payFull, setPayFull] = useState(false);
  const [gcashProcessing, setGcashProcessing] = useState(false);

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

    if (payMethod === 'gcash') {
      setGcashProcessing(true);
      await new Promise(r => setTimeout(r, 800));
      setGcashProcessing(false);
    }

    const principalPerInstallment = targetFin.principal / targetFin.installmentCount;
    const newPaidPrincipal = Math.min(targetFin.principal, targetFin.paidPrincipal + principalPerInstallment);
    const allPaid = targetFin.schedule.every(s => s.weekNo === payWeekNo || s.status === 'paid');

    const updatedSchedule = targetFin.schedule.map(s => {
      if (s.weekNo === payWeekNo) return { ...s, status: 'paid' as const, paidAt: new Date().toISOString(), paidMethod: payMethod };
      if (s.weekNo === payWeekNo + 1 && s.status === 'upcoming') return { ...s, status: 'due' as const };
      return s;
    });

    const updatedFinancing: Financing = {
      ...targetFin,
      paidPrincipal: newPaidPrincipal,
      schedule: updatedSchedule,
      status: allPaid ? 'completed' : targetFin.status,
    };

    const newPayment: Payment = {
      id: `pay${Date.now()}`,
      paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
      customerId: targetFin.customerId,
      financingId: targetFin.id,
      type: 'installment',
      method: payMethod,
      amount: inst.baseAmount + inst.penalty,
      status: 'paid',
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    };

    try {
      await saveRecord('financing', updatedFinancing);
      await saveRecord('payments', newPayment);
      const newUsed = Math.max(0, customer.usedCredit - principalPerInstallment);
      await updateRecord('customers', customer.id, { usedCredit: newUsed });
    } catch (err: any) {
      console.error('Failed to save installment payment to RTDB:', err);
    }

    dispatch({ type: 'PAY_INSTALLMENT', financingId: selectedFin, weekNo: payWeekNo, method: payMethod });
    showToast('success', `Installment #${payWeekNo} paid successfully via ${payMethod === 'gcash' ? 'GCash' : 'Cash'}. Credit restored.`);
    setPayWeekNo(null);
    setSelectedFin(null);
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

    const remainingPrincipal = Math.max(0, targetFin.principal - targetFin.paidPrincipal);
    if (remainingPrincipal <= 0) return;

    if (payMethod === 'gcash') {
      setGcashProcessing(true);
      await new Promise(r => setTimeout(r, 800));
      setGcashProcessing(false);
    }

    const remaining = targetFin.totalRepayable - (targetFin.paidPrincipal / targetFin.principal * targetFin.totalRepayable);
    const updatedSchedule = targetFin.schedule.map(s =>
      s.status !== 'paid' ? { ...s, status: 'paid' as const, paidAt: new Date().toISOString(), paidMethod: payMethod } : s
    );

    const updatedFinancing: Financing = {
      ...targetFin,
      paidPrincipal: targetFin.principal,
      schedule: updatedSchedule,
      status: 'completed',
    };

    const newPayment: Payment = {
      id: `pay${Date.now()}`,
      paymentNo: `PAY-${String(state.payments.length + 1).padStart(4, '0')}`,
      customerId: targetFin.customerId,
      financingId: targetFin.id,
      type: 'full_settlement',
      method: payMethod,
      amount: Math.round(remaining * 100) / 100,
      status: 'paid',
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    };

    try {
      await saveRecord('financing', updatedFinancing);
      await saveRecord('payments', newPayment);
      const newUsed = Math.max(0, customer.usedCredit - remainingPrincipal);
      await updateRecord('customers', customer.id, { usedCredit: newUsed });
    } catch (err: any) {
      console.error('Failed to save full settlement to RTDB:', err);
    }

    dispatch({ type: 'PAY_FULL_BALANCE', financingId: selectedFin, method: payMethod });
    showToast('success', 'Full balance settled! Credit fully restored and financing completed.');
    setPayFull(false);
    setSelectedFin(null);
  };

  const fin = financing.find(f => f.id === selectedFin);

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header Bento */}
        <h1 className="text-2xl font-800 text-[#0D2B45] mb-5">My Financing</h1>

        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-6 md:col-span-3 bg-[#1E7D3B] rounded-2xl p-4">
            <div className="text-white/70 text-xs font-600 uppercase tracking-wider">Available Credit</div>
            <div className="text-white font-800 text-2xl mt-1">{formatPHP(available)}</div>
          </div>
          <div className="col-span-6 md:col-span-3 bg-white rounded-2xl p-4 border border-[#E4E8E6]">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Credit Limit</div>
            <div className="text-[#0D2B45] font-800 text-2xl mt-1">{formatPHP(customer.creditLimit)}</div>
          </div>
          <div className="col-span-6 md:col-span-3 bg-white rounded-2xl p-4 border border-[#E4E8E6]">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Used Credit</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{formatPHP(customer.usedCredit)}</div>
          </div>
          <div className="col-span-6 md:col-span-3 bg-[#FFF8E1] rounded-2xl p-4 border border-[#FFC107]/30">
            <div className="text-[#65727A] text-xs font-600 uppercase tracking-wider">Outstanding</div>
            <div className="text-[#10212B] font-800 text-2xl mt-1">{formatPHP(Math.round(totalOutstanding))}</div>
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
              return (
                <div key={fin.id} className="bg-white rounded-2xl border border-[#E4E8E6] overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="font-800 text-base text-[#10212B]">{fin.financingNo}</div>
                        <div className="text-xs text-[#65727A] mt-0.5">
                          {fin.plan}-Month Plan · {fin.installmentCount} installments of {formatPHP(fin.weeklyInstallment)}
                        </div>
                      </div>
                      <FinancingStatusBadge status={fin.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-[#65727A]">Principal</div>
                        <div className="font-700 text-sm text-[#10212B]">{formatPHP(fin.principal)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#65727A]">Total Repayable</div>
                        <div className="font-700 text-sm text-[#10212B]">{formatPHP(fin.totalRepayable)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#65727A]">Remaining</div>
                        <div className={`font-700 text-sm ${remaining > 0 ? 'text-[#10212B]' : 'text-[#1E7D3B]'}`}>{remaining > 0 ? formatPHP(remaining) : 'Fully Paid'}</div>
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

                    {(fin.status === 'active' || fin.status === 'overdue') && nextDue && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-[#65727A]">Next due: </span>
                          <span className="font-700 text-[#10212B]">{formatPHP(nextDue.baseAmount + nextDue.penalty)}</span>
                          <span className="text-[#65727A]"> on {new Date(nextDue.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                          {nextDue.penalty > 0 && <span className="text-red-500 text-xs ml-1">(+{formatPHP(nextDue.penalty)} penalty)</span>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedFin(fin.id); setPayWeekNo(nextDue.weekNo); }}
                            className="px-3 py-1.5 bg-[#1E7D3B] text-white text-xs font-600 rounded-xl hover:bg-[#22913f] transition-all"
                          >
                            Pay Installment
                          </button>
                          <button
                            onClick={() => { setSelectedFin(fin.id); setPayFull(true); }}
                            className="px-3 py-1.5 bg-[#0D2B45] text-white text-xs font-600 rounded-xl hover:bg-[#1a3d5c] transition-all"
                          >
                            Pay Full Balance
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
                        {fin.schedule.map(s => (
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
                            </div>
                          </div>
                        ))}
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
      <Modal open={payWeekNo !== null && selectedFin !== null} onClose={() => { setPayWeekNo(null); setSelectedFin(null); }} title="Pay Installment" size="sm">
        {fin && payWeekNo !== null && (() => {
          const s = fin.schedule.find(i => i.weekNo === payWeekNo);
          if (!s) return null;
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
                      {m === 'gcash' ? 'GCash (instant)' : 'Cash (staff confirms)'}
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={doPayInstallment}
                disabled={gcashProcessing}
                className="w-full py-3 bg-[#1E7D3B] text-white font-700 text-sm rounded-xl hover:bg-[#22913f] transition-all disabled:opacity-60"
              >
                {gcashProcessing ? 'Processing…' : `Pay ${formatPHP(s.baseAmount + s.penalty)} via ${payMethod === 'gcash' ? 'GCash' : 'Cash'}`}
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* Pay Full Balance Modal */}
      <Modal open={payFull && selectedFin !== null} onClose={() => { setPayFull(false); setSelectedFin(null); }} title="Pay Full Balance" size="sm">
        {fin && (() => {
          const remaining = Math.round(fin.totalRepayable - (fin.paidPrincipal / fin.principal * fin.totalRepayable));
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
                      {m === 'gcash' ? 'GCash' : 'Cash'}
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={doPayFull}
                disabled={gcashProcessing}
                className="w-full py-3 bg-[#0D2B45] text-white font-700 text-sm rounded-xl hover:bg-[#1a3d5c] transition-all disabled:opacity-60"
              >
                {gcashProcessing ? 'Processing…' : `Settle Full Balance — ${formatPHP(remaining)}`}
              </button>
            </div>
          );
        })()}
      </Modal>
    </CustomerLayout>
  );
}
