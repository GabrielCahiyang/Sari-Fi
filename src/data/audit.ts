import type { AppState, AuditEntry, AuditActorRole, AuditCategory } from '../types';

/**
 * Central audit derivation.
 *
 * Rather than sprinkling manual log calls across the app, every state
 * mutation flows through `deriveAudit`, which inspects the dispatched action
 * (plus the state before/after) and produces a single structured audit entry.
 * This guarantees the trail captures *everything* consistently, with a real
 * actor, role, category, and target on each record.
 */

// The action union is defined in AppContext; we type this loosely to avoid a
// circular import and keep the derivation table readable.
type AnyAction = { type: string; [key: string]: unknown };

interface Actor {
  actorId: string | null;
  actorName: string;
  actorRole: AuditActorRole;
}

function actorFrom(state: AppState): Actor {
  const u = state.currentUser;
  if (!u) return { actorId: null, actorName: 'System', actorRole: 'system' };
  return { actorId: u.id, actorName: u.name, actorRole: u.role };
}

const SYSTEM: Actor = { actorId: null, actorName: 'System', actorRole: 'system' };

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

let seq = 0;
function makeId() {
  seq += 1;
  return `aud${Date.now().toString(36)}${seq.toString(36)}`;
}

const customerName = (state: AppState, id?: string) =>
  state.customers.find(c => c.id === id)?.fullName ?? 'a customer';

interface Derived {
  actor?: Actor;
  category: AuditCategory;
  action: string;
  summary: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  amount?: number;
}

// Returns the audit content for an action, or null if it isn't audit-worthy
// (pure UI events like navigation, toast, and cart edits are intentionally skipped).
function describe(action: AnyAction, prev: AppState, next: AppState): Derived | null {
  const a = action as any;
  switch (action.type) {
    case 'LOGIN':
      return {
        actor: { actorId: a.user.id, actorName: a.user.name, actorRole: a.user.role },
        category: 'auth',
        action: 'auth.login',
        summary: `${a.user.name} signed in`,
      };
    case 'LOGOUT': {
      const u = prev.currentUser;
      if (!u) return null;
      return {
        actor: { actorId: u.id, actorName: u.name, actorRole: u.role },
        category: 'auth',
        action: 'auth.logout',
        summary: `${u.name} signed out`,
      };
    }
    case 'PLACE_ORDER': {
      const o = a.order;
      const who = customerName(next, o.customerId);
      const method = o.paymentType === 'split' ? 'split payment'
        : o.paymentType === 'financing' ? 'financing'
        : o.paymentType.toUpperCase();
      const summary = o.channel === 'pos'
        ? `In-store order ${o.orderNo} rung up for ${who} (${o.items.length} item${o.items.length > 1 ? 's' : ''}) via ${method}`
        : `${who} placed order ${o.orderNo} (${o.items.length} item${o.items.length > 1 ? 's' : ''}) via ${method}`;
      return {
        category: 'order',
        action: 'order.place',
        summary,
        targetType: 'order',
        targetId: o.id,
        targetLabel: o.orderNo,
        amount: o.total,
      };
    }
    case 'UPDATE_ORDER_STATUS': {
      const o = next.orders.find(x => x.id === a.orderId);
      const label = o?.orderNo ?? a.orderId;
      return {
        category: 'order',
        action: 'order.status',
        summary: `Order ${label} marked ${String(a.status).replace(/_/g, ' ')}`,
        targetType: 'order',
        targetId: a.orderId,
        targetLabel: label,
      };
    }
    case 'APPROVE_FINANCING': {
      const f = next.financing.find(x => x.id === a.financingId);
      const who = customerName(next, f?.customerId);
      return {
        category: 'financing',
        action: 'financing.approve',
        summary: `Approved ${f?.financingNo ?? a.financingId} for ${who} (${peso(f?.principal ?? 0)} principal)`,
        targetType: 'financing',
        targetId: a.financingId,
        targetLabel: f?.financingNo,
        amount: f?.principal,
      };
    }
    case 'REJECT_FINANCING': {
      const f = next.financing.find(x => x.id === a.financingId);
      const who = customerName(next, f?.customerId);
      return {
        category: 'financing',
        action: 'financing.reject',
        summary: `Rejected ${f?.financingNo ?? a.financingId} for ${who}`,
        targetType: 'financing',
        targetId: a.financingId,
        targetLabel: f?.financingNo,
      };
    }
    case 'PAY_INSTALLMENT': {
      const f = next.financing.find(x => x.id === a.financingId);
      const who = customerName(next, f?.customerId);
      const auto = a.method === 'gcash';
      return {
        actor: auto ? SYSTEM : undefined,
        category: 'payment',
        action: 'payment.installment',
        summary: `${who} paid installment #${a.weekNo} on ${f?.financingNo ?? ''} via ${String(a.method).toUpperCase()}${auto ? ' (auto-confirmed)' : ''}`,
        targetType: 'financing',
        targetId: a.financingId,
        targetLabel: f?.financingNo,
      };
    }
    case 'PAY_FULL_BALANCE': {
      const f = next.financing.find(x => x.id === a.financingId);
      const who = customerName(next, f?.customerId);
      return {
        category: 'payment',
        action: 'payment.settlement',
        summary: `${who} fully settled ${f?.financingNo ?? ''} via ${String(a.method).toUpperCase()}`,
        targetType: 'financing',
        targetId: a.financingId,
        targetLabel: f?.financingNo,
      };
    }
    case 'CONFIRM_CASH_PAYMENT': {
      const p = next.payments.find(x => x.id === a.paymentId);
      const who = customerName(next, p?.customerId);
      return {
        category: 'payment',
        action: 'payment.confirm_cash',
        summary: `Confirmed ${peso(p?.amount ?? 0)} cash payment ${p?.paymentNo ?? ''} for ${who}`,
        targetType: 'payment',
        targetId: a.paymentId,
        targetLabel: p?.paymentNo,
        amount: p?.amount,
      };
    }
    case 'ADD_CUSTOMER':
      return {
        category: 'customer',
        action: 'customer.create',
        summary: `Created customer account for ${a.customer.fullName} (${a.customer.accountNo})`,
        targetType: 'customer',
        targetId: a.customer.id,
        targetLabel: a.customer.accountNo,
      };
    case 'UPDATE_CUSTOMER': {
      const before = prev.customers.find(c => c.id === a.customer.id);
      const c = a.customer;
      let summary = `Updated customer ${c.fullName}`;
      if (before && before.creditLimit !== c.creditLimit) {
        summary = `Changed ${c.fullName}'s credit limit to ${peso(c.creditLimit)}`;
      } else if (before && before.status !== c.status) {
        summary = `${c.status === 'suspended' ? 'Suspended' : 'Reactivated'} customer ${c.fullName}`;
      }
      return {
        category: 'customer',
        action: 'customer.update',
        summary,
        targetType: 'customer',
        targetId: c.id,
        targetLabel: c.accountNo,
      };
    }
    case 'ADD_EMPLOYEE':
      return {
        category: 'employee',
        action: 'employee.create',
        summary: `Created staff account for ${a.employee.name} (${a.employee.role})`,
        targetType: 'employee',
        targetId: a.employee.id,
        targetLabel: a.employee.name,
      };
    case 'UPDATE_EMPLOYEE': {
      const before = prev.employees.find(e => e.id === a.employee.id);
      const e = a.employee;
      const summary = before && before.status !== e.status
        ? `${e.status === 'active' ? 'Enabled' : 'Disabled'} staff account ${e.name}`
        : `Updated staff account ${e.name}`;
      return {
        category: 'employee',
        action: 'employee.update',
        summary,
        targetType: 'employee',
        targetId: e.id,
        targetLabel: e.name,
      };
    }
    case 'ADD_PRODUCT':
      return {
        category: 'inventory',
        action: 'product.create',
        summary: `Added product ${a.product.name} (${a.product.sku})`,
        targetType: 'product',
        targetId: a.product.id,
        targetLabel: a.product.sku,
      };
    case 'UPDATE_PRODUCT': {
      const before = prev.products.find(p => p.id === a.product.id);
      const p = a.product;
      const summary = before && before.stock !== p.stock
        ? `Adjusted stock for ${p.name} (${before.stock} → ${p.stock})`
        : `Updated product ${p.name}`;
      return {
        category: 'inventory',
        action: 'product.update',
        summary,
        targetType: 'product',
        targetId: p.id,
        targetLabel: p.sku,
      };
    }
    case 'ADD_SUPPLIER':
      return {
        category: 'supplier',
        action: 'supplier.create',
        summary: `Added supplier ${a.supplier.name}`,
        targetType: 'supplier',
        targetId: a.supplier.id,
        targetLabel: a.supplier.name,
      };
    case 'UPDATE_SUPPLIER':
      return {
        category: 'supplier',
        action: 'supplier.update',
        summary: `Updated supplier ${a.supplier.name}`,
        targetType: 'supplier',
        targetId: a.supplier.id,
        targetLabel: a.supplier.name,
      };
    case 'ADD_RESTOCK':
      return {
        category: 'restock',
        action: 'restock.create',
        summary: `Created restock order ${a.restock.restockNo} from ${a.restock.supplierName} (${peso(a.restock.totalCost)})`,
        targetType: 'restock',
        targetId: a.restock.id,
        targetLabel: a.restock.restockNo,
        amount: a.restock.totalCost,
      };
    case 'UPDATE_RESTOCK_STATUS': {
      const r = next.restockOrders.find(x => x.id === a.restockId);
      return {
        category: 'restock',
        action: 'restock.status',
        summary: `Restock ${r?.restockNo ?? a.restockId} marked ${a.status}`,
        targetType: 'restock',
        targetId: a.restockId,
        targetLabel: r?.restockNo,
      };
    }
    case 'UPDATE_SETTINGS': {
      const changed: string[] = [];
      const p = prev.settings as any;
      const n = next.settings as any;
      for (const k of Object.keys(n)) {
        if (p[k] !== n[k]) changed.push(k.replace(/([A-Z])/g, ' $1').toLowerCase());
      }
      return {
        category: 'settings',
        action: 'settings.update',
        summary: changed.length
          ? `Updated system settings — ${changed.join(', ')}`
          : 'Saved system settings',
      };
    }
    default:
      return null;
  }
}

export function deriveAudit(action: AnyAction, prev: AppState, next: AppState): AuditEntry | null {
  const d = describe(action, prev, next);
  if (!d) return null;
  const actor = d.actor ?? actorFrom(prev);
  return {
    id: makeId(),
    timestamp: new Date().toISOString(),
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    category: d.category,
    action: d.action,
    summary: d.summary,
    targetType: d.targetType,
    targetId: d.targetId,
    targetLabel: d.targetLabel,
    amount: d.amount,
  };
}

// ── Presentation metadata (shared by every audit surface) ──────────────
export const CATEGORY_META: Record<AuditCategory, { label: string; tint: string; dot: string; icon: string }> = {
  auth:      { label: 'Authentication', tint: 'bg-slate-50 text-slate-600',   dot: 'bg-slate-400',   icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
  order:     { label: 'Orders',         tint: 'bg-sky-50 text-sky-700',       dot: 'bg-sky-500',     icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  financing: { label: 'Financing',      tint: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  payment:   { label: 'Payments',       tint: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-500',   icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  inventory: { label: 'Inventory',      tint: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500',   icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  restock:   { label: 'Restock',        tint: 'bg-cyan-50 text-cyan-700',     dot: 'bg-cyan-500',     icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  customer:  { label: 'Customers',      tint: 'bg-teal-50 text-teal-700',     dot: 'bg-teal-500',     icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  employee:  { label: 'Employees',      tint: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500',   icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  supplier:  { label: 'Suppliers',      tint: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500',   icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
  settings:  { label: 'Settings',       tint: 'bg-rose-50 text-rose-700',     dot: 'bg-rose-500',     icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
};

export const ROLE_META: Record<AuditActorRole, { label: string; variant: 'green' | 'navy' | 'orange' | 'gray' | 'blue' }> = {
  customer:   { label: 'Customer',   variant: 'blue' },
  employee:   { label: 'Employee',   variant: 'green' },
  supervisor: { label: 'Supervisor', variant: 'orange' },
  admin:      { label: 'Admin',      variant: 'navy' },
  system:     { label: 'System',     variant: 'gray' },
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
