import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import type { SystemSettings } from '../../types';
import { saveSettings } from '../../services/firebase/rtdbService';

export function SettingsPage() {
  const { state, dispatch, showToast, logAudit, formatPHP } = useApp();
  const [settings, setSettings] = useState<SystemSettings>(state.settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(state.settings);
  }, [state.settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      dispatch({ type: 'UPDATE_SETTINGS', settings });
      await logAudit({
        category: 'settings',
        action: 'settings.update',
        summary: 'Updated system financing & credit limits settings',
        targetType: 'settings',
      });
      showToast('success', 'Settings saved successfully.');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof SystemSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: isNaN(value) ? 0 : value }));
  };

  // Live financing calculation preview
  const principal = 5000;
  const charge = Math.round(principal * settings.financingCharge / 100);
  const total = principal + charge;
  const weekly1 = Math.round(total / settings.plan1Installments * 100) / 100;
  const weekly2 = Math.round(total / settings.plan2Installments * 100) / 100;

  return (
    <InternalLayout title="Settings">
      <div className="max-w-3xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Financing Settings */}
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-6">
            <div className="font-700 text-base text-[#10212B] mb-5">Financing Settings</div>
            <div className="grid grid-cols-2 gap-5">
              {[
                { key: 'financingCharge', label: 'Financing Charge (%)', hint: 'Applied to principal amount', min: 1, max: 100 },
                { key: 'startingCreditLimit', label: 'Starting Credit Limit (₱)', hint: 'Default for new customers', min: 1000, max: 50000 },
                { key: 'limitIncreaseAmount', label: 'Limit Increase per Cycle (₱)', hint: 'After successful repayment', min: 0, max: 10000 },
                { key: 'maxAutomaticLimit', label: 'Maximum Auto Limit (₱)', hint: 'Cap for automatic increases', min: 5000, max: 100000 },
              ].map(({ key, label, hint, min, max }) => (
                <div key={key}>
                  <label className="text-xs font-600 text-[#65727A]">{label}</label>
                  <input
                    type="number"
                    value={settings[key as keyof SystemSettings]}
                    onChange={e => update(key as keyof SystemSettings, parseFloat(e.target.value))}
                    min={min}
                    max={max}
                    className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] font-600"
                  />
                  <div className="text-[11px] text-[#65727A] mt-0.5">{hint}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Penalty */}
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-6">
            <div className="font-700 text-base text-[#10212B] mb-5">Overdue Penalty</div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-600 text-[#65727A]">Weekly Overdue Penalty (%)</label>
                <input
                  type="number"
                  value={settings.weeklyPenalty}
                  onChange={e => update('weeklyPenalty', parseFloat(e.target.value))}
                  min={0}
                  max={50}
                  className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] font-600"
                />
                <div className="text-[11px] text-[#65727A] mt-0.5">Applied per overdue week on base installment</div>
              </div>
              <div className="bg-[#FFF8E1] border border-[#FFC107]/30 rounded-xl p-3 text-xs">
                <div className="font-700 text-[#10212B] mb-1">Live Calculation</div>
                <div className="text-[#65727A]">Base installment: ₱500</div>
                <div className="text-[#65727A]">Penalty ({settings.weeklyPenalty}%): {formatPHP(Math.round(500 * settings.weeklyPenalty / 100))}</div>
                <div className="font-700 text-[#10212B] mt-1">Total due: {formatPHP(Math.round(500 + 500 * settings.weeklyPenalty / 100))}</div>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="bg-white rounded-2xl border border-[#E4E8E6] p-6">
            <div className="font-700 text-base text-[#10212B] mb-5">Repayment Plans</div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-600 text-[#65727A]">1-Month Plan — Installments</label>
                <input type="number" value={settings.plan1Installments} onChange={e => update('plan1Installments', parseInt(e.target.value))} min={1} max={12} className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] font-600" />
              </div>
              <div>
                <label className="text-xs font-600 text-[#65727A]">2-Month Plan — Installments</label>
                <input type="number" value={settings.plan2Installments} onChange={e => update('plan2Installments', parseInt(e.target.value))} min={1} max={16} className="mt-1 w-full px-3 py-2.5 border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] font-600" />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-[#0D2B45] rounded-2xl p-6">
            <div className="font-700 text-sm text-white mb-4">Live Calculation Preview (₱5,000 example)</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Principal', formatPHP(principal)],
                [`Finance Charge (${settings.financingCharge}%)`, formatPHP(charge)],
                ['Total Repayable', formatPHP(total)],
                ['1-Month Weekly (×' + settings.plan1Installments + ')', formatPHP(weekly1)],
                ['2-Month Weekly (×' + settings.plan2Installments + ')', formatPHP(weekly2)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/60">{label}</span>
                  <span className="text-white font-700">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 font-700 text-sm rounded-xl transition-all cursor-pointer ${
              saved ? 'bg-[#7DBE4C] text-white' : 'bg-[#1E7D3B] text-white hover:bg-[#22913f]'
            } disabled:opacity-60`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved Settings!' : 'Save Settings'}
          </button>
        </form>
      </div>
    </InternalLayout>
  );
}
