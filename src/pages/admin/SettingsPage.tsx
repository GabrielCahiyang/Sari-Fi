import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import type { PaymentFrequency, PlanDurationUnit, RepaymentPlan, SystemSettings } from '../../types';
import { saveSettings } from '../../services/firebase/rtdbService';
import { formatFrequency, formatPlanDuration, normalizeRepaymentSettings } from '../../utils/repaymentPlans';

type NumericSettingKey = 'financingCharge' | 'startingCreditLimit' | 'limitIncreaseAmount' | 'maxAutomaticLimit' | 'weeklyPenalty';
const durationUnits: PlanDurationUnit[] = ['day', 'week', 'month', 'year'];
const frequencies: PaymentFrequency[] = ['daily', 'weekly', 'monthly'];

function createPlan(): RepaymentPlan {
  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: 'New Flex Plan',
    durationValue: 1,
    durationUnit: 'month',
    paymentFrequency: 'weekly',
    installmentCount: 4,
    active: true,
  };
}

export function SettingsPage() {
  const { state, dispatch, showToast, logAudit, formatPHP } = useApp();
  const [settings, setSettings] = useState<SystemSettings>(() => normalizeRepaymentSettings(state.settings));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => setSettings(normalizeRepaymentSettings(state.settings)), [state.settings]);

  const update = (key: NumericSettingKey, value: number) => {
    setValidationError('');
    setSettings(prev => ({ ...prev, [key]: Number.isNaN(value) ? 0 : value }));
  };

  const updatePlan = <K extends keyof RepaymentPlan>(id: string, key: K, value: RepaymentPlan[K]) => {
    setValidationError('');
    setSettings(prev => ({
      ...prev,
      repaymentPlans: prev.repaymentPlans.map(plan => plan.id === id ? { ...plan, [key]: value } : plan),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const checks: Array<[NumericSettingKey, string, number, number]> = [
      ['financingCharge', 'Financing charge', 1, 100],
      ['startingCreditLimit', 'Starting credit limit', 1000, 50000],
      ['limitIncreaseAmount', 'Limit increase per cycle', 0, 10000],
      ['maxAutomaticLimit', 'Maximum automatic limit', 5000, 100000],
      ['weeklyPenalty', 'Weekly overdue penalty', 0, 50],
    ];
    for (const [key, label, min, max] of checks) {
      const value = settings[key];
      if (!Number.isFinite(value) || value < min || value > max) {
        const message = `${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`;
        setValidationError(message); showToast('error', message); return;
      }
    }
    if (settings.maxAutomaticLimit < settings.startingCreditLimit) {
      const message = 'Maximum automatic limit cannot be lower than the starting credit limit.';
      setValidationError(message); showToast('error', message); return;
    }
    if (settings.repaymentPlans.length === 0 || !settings.repaymentPlans.some(plan => plan.active)) {
      const message = settings.repaymentPlans.length === 0 ? 'Add at least one repayment plan.' : 'At least one repayment plan must be active for checkout.';
      setValidationError(message); showToast('error', message); return;
    }
    const names = new Set<string>();
    for (const plan of settings.repaymentPlans) {
      const name = plan.name.trim().toLowerCase();
      if (!name) { const message = 'Every repayment plan needs a name.'; setValidationError(message); showToast('error', message); return; }
      if (names.has(name)) { const message = 'Repayment plan names must be unique.'; setValidationError(message); showToast('error', message); return; }
      names.add(name);
      if (!Number.isInteger(plan.durationValue) || plan.durationValue < 1 || plan.durationValue > 999) {
        const message = `${plan.name}: duration must be a whole number between 1 and 999.`; setValidationError(message); showToast('error', message); return;
      }
      if (!Number.isInteger(plan.installmentCount) || plan.installmentCount < 1 || plan.installmentCount > 999) {
        const message = `${plan.name}: installment count must be a whole number between 1 and 999.`; setValidationError(message); showToast('error', message); return;
      }
    }

    const settingsToSave: SystemSettings = {
      financingCharge: settings.financingCharge,
      startingCreditLimit: settings.startingCreditLimit,
      limitIncreaseAmount: settings.limitIncreaseAmount,
      maxAutomaticLimit: settings.maxAutomaticLimit,
      weeklyPenalty: settings.weeklyPenalty,
      repaymentPlans: settings.repaymentPlans.map(plan => ({ ...plan, name: plan.name.trim() })),
    };
    setValidationError(''); setSaving(true);
    try {
      await saveSettings(settingsToSave);
      dispatch({ type: 'UPDATE_SETTINGS', settings: settingsToSave });
      await logAudit({ category: 'settings', action: 'settings.update', summary: `Updated financing settings and ${settingsToSave.repaymentPlans.length} repayment plans`, targetType: 'settings', targetId: 'system_settings', targetLabel: 'System Settings' });
      showToast('success', 'Settings saved. Active plans are now available across the system.');
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error(err); showToast('error', 'Failed to save settings: ' + err.message);
    } finally { setSaving(false); }
  };

  const principal = 5000;
  const charge = Math.round(principal * settings.financingCharge / 100);
  const total = principal + charge;
  const activePlans = settings.repaymentPlans.filter(plan => plan.active);

  return (
    <InternalLayout title="Settings">
      <div className="max-w-6xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6" noValidate>
          {validationError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-600 text-red-700">{validationError}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div><div className="font-800 text-base text-[#10212B]">Financing controls</div><div className="text-xs text-[#65727A] mt-1">Core credit rules used for every new financing request.</div></div>
                <span className="shrink-0 rounded-full bg-[#F0FAF4] px-3 py-1 text-[10px] font-800 uppercase tracking-wider text-[#1E7D3B]">Live system rules</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {[
                  { key: 'financingCharge' as const, label: 'Financing Charge (%)', hint: 'Applied to principal amount', min: 1, max: 100 },
                  { key: 'startingCreditLimit' as const, label: 'Starting Credit Limit (₱)', hint: 'Default for new customers', min: 1000, max: 50000 },
                  { key: 'limitIncreaseAmount' as const, label: 'Limit Increase per Cycle (₱)', hint: 'After successful repayment', min: 0, max: 10000 },
                  { key: 'maxAutomaticLimit' as const, label: 'Maximum Auto Limit (₱)', hint: 'Cap for automatic increases', min: 5000, max: 100000 },
                ].map(({ key, label, hint, min, max }) => (
                  <div key={key}><label className="text-xs font-600 text-[#65727A]">{label}</label><input type="number" value={settings[key]} onChange={e => update(key, parseFloat(e.target.value))} min={min} max={max} className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] font-600" /><div className="text-[11px] text-[#65727A] mt-0.5">{hint}</div></div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-[#0D2B45] p-5 sm:p-6 text-white overflow-hidden relative">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#7DBE4C]/15" />
              <div className="relative"><div className="text-[10px] font-800 uppercase tracking-[0.16em] text-white/50">Portfolio preview</div><div className="mt-2 text-3xl font-800 tnum">{formatPHP(total)}</div><div className="text-xs text-white/60">Total repayable on a {formatPHP(principal)} order</div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/8 p-3"><div className="text-[10px] text-white/50">Charge</div><div className="mt-1 font-700">{formatPHP(charge)}</div></div><div className="rounded-xl bg-white/8 p-3"><div className="text-[10px] text-white/50">Active plans</div><div className="mt-1 font-700">{activePlans.length}</div></div></div></div>
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div><div className="font-800 text-base text-[#10212B]">Repayment plans</div><div className="text-xs text-[#65727A] mt-1">Build flexible daily, weekly, or monthly options. Existing financing agreements will not change.</div></div>
              <button type="button" onClick={() => { setSettings(prev => ({ ...prev, repaymentPlans: [...prev.repaymentPlans, createPlan()] })); setValidationError(''); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E7D3B] px-4 py-2.5 text-xs font-700 text-white transition-colors hover:bg-[#22913f]"><span className="text-base leading-none">+</span> Add repayment plan</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {settings.repaymentPlans.map((plan, index) => {
                const amount = Math.round(total / Math.max(plan.installmentCount, 1) * 100) / 100;
                return (
                  <article key={plan.id} className={`rounded-2xl border p-4 sm:p-5 transition-colors ${plan.active ? 'border-[#CFE2D4] bg-[#FBFDFC]' : 'border-[#E4E8E6] bg-[#F7F8F6] opacity-80'}`}>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-800 ${plan.active ? 'bg-[#0D2B45] text-white' : 'bg-[#E4E8E6] text-[#65727A]'}`}>{index + 1}</div><div className="min-w-0"><div className="text-[10px] font-800 uppercase tracking-wider text-[#65727A]">Plan configuration</div><div className="truncate text-sm font-700 text-[#10212B]">{plan.name || 'Untitled plan'}</div></div></div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-700 text-[#65727A]"><input type="checkbox" checked={plan.active} onChange={e => updatePlan(plan.id, 'active', e.target.checked)} className="peer sr-only" /><span className="relative h-6 w-11 rounded-full bg-[#D7DDDA] transition-colors peer-checked:bg-[#1E7D3B] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />{plan.active ? 'Active' : 'Hidden'}</label>
                    </div>
                    <div className="space-y-4">
                      <div><label className="text-[11px] font-700 text-[#65727A]">Plan name</label><input value={plan.name} onChange={e => updatePlan(plan.id, 'name', e.target.value)} maxLength={60} className="mt-1 w-full rounded-xl border border-[#E4E8E6] bg-white px-3 py-2.5 text-sm font-600 text-[#10212B] focus:border-[#1E7D3B] focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/20" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[11px] font-700 text-[#65727A]">Duration</label><input type="number" min={1} max={999} value={plan.durationValue} onChange={e => updatePlan(plan.id, 'durationValue', parseInt(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-[#E4E8E6] bg-white px-3 py-2.5 text-sm font-600 focus:border-[#1E7D3B] focus:outline-none" /></div>
                        <div><label className="text-[11px] font-700 text-[#65727A]">Duration unit</label><select value={plan.durationUnit} onChange={e => updatePlan(plan.id, 'durationUnit', e.target.value as PlanDurationUnit)} className="mt-1 w-full rounded-xl border border-[#E4E8E6] bg-white px-3 py-2.5 text-sm font-600 capitalize focus:border-[#1E7D3B] focus:outline-none">{durationUnits.map(unit => <option key={unit} value={unit}>{unit[0].toUpperCase() + unit.slice(1)}s</option>)}</select></div>
                        <div><label className="text-[11px] font-700 text-[#65727A]">Payment frequency</label><select value={plan.paymentFrequency} onChange={e => updatePlan(plan.id, 'paymentFrequency', e.target.value as PaymentFrequency)} className="mt-1 w-full rounded-xl border border-[#E4E8E6] bg-white px-3 py-2.5 text-sm font-600 focus:border-[#1E7D3B] focus:outline-none">{frequencies.map(frequency => <option key={frequency} value={frequency}>{formatFrequency(frequency)}</option>)}</select></div>
                        <div><label className="text-[11px] font-700 text-[#65727A]">Installments</label><input type="number" min={1} max={999} value={plan.installmentCount} onChange={e => updatePlan(plan.id, 'installmentCount', parseInt(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-[#E4E8E6] bg-white px-3 py-2.5 text-sm font-600 focus:border-[#1E7D3B] focus:outline-none" /></div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-[#E4E8E6]"><div><div className="text-[10px] text-[#65727A]">{formatPlanDuration(plan)} · {formatFrequency(plan.paymentFrequency)}</div><div className="mt-0.5 text-sm font-800 text-[#1E7D3B]">{formatPHP(amount)} <span className="text-[10px] font-600 text-[#65727A]">× {plan.installmentCount}</span></div></div><button type="button" onClick={() => { setSettings(prev => ({ ...prev, repaymentPlans: prev.repaymentPlans.filter(item => item.id !== plan.id) })); setValidationError(''); }} disabled={settings.repaymentPlans.length === 1} className="rounded-lg px-2.5 py-1.5 text-[11px] font-700 text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30">Remove</button></div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-[#E4E8E6] bg-white p-4 sm:p-6"><div className="font-800 text-base text-[#10212B] mb-1">Overdue protection</div><div className="text-xs text-[#65727A] mb-4">Penalty remains weekly and is applied to overdue installment balances.</div><label className="text-xs font-600 text-[#65727A]">Weekly Overdue Penalty (%)</label><input type="number" value={settings.weeklyPenalty} onChange={e => update('weeklyPenalty', parseFloat(e.target.value))} min={0} max={50} className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] font-600" /></div>
            <div className="rounded-2xl border border-[#FFC107]/30 bg-[#FFF8E1] p-5"><div className="text-[10px] font-800 uppercase tracking-wider text-amber-700">Penalty example</div><div className="mt-3 text-xs text-[#65727A]">Base installment</div><div className="font-800 text-xl text-[#10212B]">₱500</div><div className="mt-3 border-t border-[#FFC107]/30 pt-3 text-xs text-[#65727A]">After one overdue week</div><div className="font-800 text-lg text-[#10212B]">{formatPHP(Math.round(500 + 500 * settings.weeklyPenalty / 100))}</div></div>
          </section>

          <button type="submit" disabled={saving} className={`w-full py-3.5 font-700 text-sm rounded-xl transition-all cursor-pointer ${saved ? 'bg-[#7DBE4C] text-white' : 'bg-[#1E7D3B] text-white hover:bg-[#22913f]'} disabled:opacity-60`}>{saving ? 'Saving…' : saved ? '✓ Saved Settings!' : 'Save & Publish Settings'}</button>
        </form>
      </div>
    </InternalLayout>
  );
}
