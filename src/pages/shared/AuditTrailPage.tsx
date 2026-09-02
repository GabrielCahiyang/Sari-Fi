import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { InternalLayout } from '../../components/layout/InternalLayout';
import { AuditTrail } from '../../components/AuditTrail';

export function AuditTrailPage() {
  const { state } = useApp();
  const log = state.auditLog;

  const stats = useMemo(() => {
    const day = 86400000;
    const today = log.filter(e => Date.now() - new Date(e.timestamp).getTime() < day).length;
    const staff = log.filter(e => e.actorRole !== 'customer' && e.actorRole !== 'system').length;
    const customers = log.filter(e => e.actorRole === 'customer').length;
    return { total: log.length, today, staff, customers };
  }, [log]);

  const cards = [
    { label: 'Total Events', value: stats.total, tone: 'navy' },
    { label: 'Today', value: stats.today, tone: 'green' },
    { label: 'Staff Actions', value: stats.staff, tone: 'plain' },
    { label: 'Customer Actions', value: stats.customers, tone: 'plain' },
  ] as const;

  return (
    <InternalLayout title="Audit Trail">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          {cards.map(c => (
            <div
              key={c.label}
              className={`rounded-2xl p-4 card-lift ${
                c.tone === 'navy' ? 'bg-gradient-to-br from-[#0D2B45] to-[#0a2237] lit-top'
                : c.tone === 'green' ? 'bg-gradient-to-br from-[#22913f] to-[#1E7D3B] lit-top'
                : 'bg-white border border-[#E4E8E6] shadow-soft-sm'}`}
            >
              <div className={`text-xs font-600 uppercase tracking-wider ${c.tone === 'plain' ? 'text-[#65727A]' : 'text-white/70'}`}>{c.label}</div>
              <div className={`font-800 text-2xl mt-1 tnum ${c.tone === 'plain' ? 'text-[#0D2B45]' : 'text-white'}`}>{c.value.toLocaleString('en-PH')}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5 shadow-soft-sm">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-800 text-sm text-[#10212B] tracking-tight">System Activity</h2>
            <span className="text-xs text-[#65727A]">— complete, filterable record of every action</span>
          </div>
          <AuditTrail entries={log} />
        </div>
      </div>
    </InternalLayout>
  );
}
