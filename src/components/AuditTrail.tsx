import { useMemo, useState } from 'react';
import type { AuditEntry, AuditActorRole, AuditCategory } from '../types';
import { CATEGORY_META, ROLE_META, relativeTime } from '../data/audit';
import { Badge } from './ui/Badge';

interface AuditTrailProps {
  entries: AuditEntry[];
  /** Show the role/category/search/date filter bar. */
  showFilters?: boolean;
  /** Cap the number of rendered rows (before "show more"). */
  pageSize?: number;
  /** Message when there are no matching entries. */
  emptyLabel?: string;
}

type RoleFilter = 'all' | AuditActorRole;
type CatFilter = 'all' | AuditCategory;
type RangeFilter = 'all' | 'today' | '7d' | '30d';

const ROLE_OPTIONS: RoleFilter[] = ['all', 'customer', 'employee', 'supervisor', 'admin', 'system'];
const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

function withinRange(iso: string, range: RangeFilter): boolean {
  if (range === 'all') return true;
  const age = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  if (range === 'today') return age < day;
  if (range === '7d') return age < day * 7;
  return age < day * 30;
}

function CategoryIcon({ category }: { category: AuditCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tint}`}>
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={meta.icon} />
      </svg>
    </span>
  );
}

export function AuditTrail({ entries, showFilters = true, pageSize = 40, emptyLabel = 'No activity recorded yet.' }: AuditTrailProps) {
  const [role, setRole] = useState<RoleFilter>('all');
  const [category, setCategory] = useState<CatFilter>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(pageSize);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(e => {
      if (role !== 'all' && e.actorRole !== role) return false;
      if (category !== 'all' && e.category !== category) return false;
      if (!withinRange(e.timestamp, range)) return false;
      if (q && !(`${e.summary} ${e.actorName} ${e.targetLabel ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [entries, role, category, range, search]);

  const visible = filtered.slice(0, limit);
  const catCounts = useMemo(() => {
    const c: Partial<Record<AuditCategory, number>> = {};
    for (const e of entries) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [entries]);

  const selectClass = 'appearance-none bg-white border border-[#E4E8E6] rounded-xl pl-3 pr-8 py-2.5 text-sm font-500 text-[#10212B] focus:outline-none focus:border-[#1E7D3B] cursor-pointer bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2365727A" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>\')] bg-[right_0.6rem_center] bg-no-repeat';

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-[#65727A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setLimit(pageSize); }}
              placeholder="Search events, people, references…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E8E6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/25 focus:border-[#1E7D3B]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={role} onChange={e => { setRole(e.target.value as RoleFilter); setLimit(pageSize); }} className={selectClass}>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r === 'all' ? 'All roles' : ROLE_META[r as AuditActorRole].label}</option>
              ))}
            </select>
            <select value={category} onChange={e => { setCategory(e.target.value as CatFilter); setLimit(pageSize); }} className={selectClass}>
              <option value="all">All categories</option>
              {(Object.keys(CATEGORY_META) as AuditCategory[]).map(c => (
                <option key={c} value={c}>{CATEGORY_META[c].label}</option>
              ))}
            </select>
            <select value={range} onChange={e => { setRange(e.target.value as RangeFilter); setLimit(pageSize); }} className={selectClass}>
              {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Category quick-filter chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategory('all'); setLimit(pageSize); }}
            className={`text-xs font-600 px-2.5 py-1 rounded-lg transition-colors ${category === 'all' ? 'bg-[#0D2B45] text-white' : 'bg-white border border-[#E4E8E6] text-[#65727A] hover:border-[#1E7D3B]/40'}`}
          >
            All · {entries.length}
          </button>
          {(Object.keys(CATEGORY_META) as AuditCategory[]).filter(c => catCounts[c]).map(c => (
            <button
              key={c}
              onClick={() => { setCategory(category === c ? 'all' : c); setLimit(pageSize); }}
              className={`inline-flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-lg transition-colors ${category === c ? 'bg-[#0D2B45] text-white' : 'bg-white border border-[#E4E8E6] text-[#65727A] hover:border-[#1E7D3B]/40'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_META[c].dot}`} />
              {CATEGORY_META[c].label} · {catCounts[c]}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {visible.length === 0 ? (
        <div className="text-center py-14 text-sm text-[#65727A]">{emptyLabel}</div>
      ) : (
        <ol className="relative">
          {/* connecting rail */}
          <span className="absolute left-[18px] top-2 bottom-2 w-px bg-[#E4E8E6]" aria-hidden />
          {visible.map(e => {
            const roleMeta = ROLE_META[e.actorRole];
            return (
              <li key={e.id} className="relative flex gap-4 pb-4 last:pb-0">
                <div className="relative z-[1]">
                  <CategoryIcon category={e.category} />
                </div>
                <div className="flex-1 min-w-0 bg-white border border-[#E4E8E6] rounded-xl px-4 py-3 card-lift shadow-soft-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#10212B] leading-snug">{e.summary}</p>
                    {typeof e.amount === 'number' && (
                      <span className="text-sm font-700 text-[#0D2B45] shrink-0 tnum">₱{Math.round(e.amount).toLocaleString('en-PH')}</span>
                    )}
                  </div>
                  <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-2">
                    <Badge variant={roleMeta.variant} size="sm" dot>{roleMeta.label}</Badge>
                    <span className="text-xs font-600 text-[#10212B]">{e.actorName}</span>
                    {e.targetLabel && (
                      <span className="text-[11px] font-600 text-[#65727A] bg-[#F7F8F6] rounded-md px-1.5 py-0.5 tnum">{e.targetLabel}</span>
                    )}
                    <span className="text-[11px] text-[#65727A]" title={new Date(e.timestamp).toLocaleString('en-PH')}>
                      · {relativeTime(e.timestamp)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex items-center justify-between text-xs text-[#65727A] pt-1">
        <span className="tnum">Showing {visible.length} of {filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
        {limit < filtered.length && (
          <button onClick={() => setLimit(l => l + pageSize)} className="font-600 text-[#1E7D3B] hover:underline">
            Load more →
          </button>
        )}
      </div>
    </div>
  );
}
