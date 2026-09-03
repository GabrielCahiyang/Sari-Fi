import { useApp } from '../../context/AppContext';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { Badge } from '../../components/ui/Badge';
import { AuditTrail } from '../../components/AuditTrail';

export function AccountPage() {
  const { state, getCurrentCustomer, getCustomerOrders, getCustomerFinancing, logout, formatPHP } = useApp();
  const customer = getCurrentCustomer();
  if (!customer) return null;

  // This customer's own slice of the audit trail: actions they performed plus
  // any staff/system events targeting their account or records.
  const orderIds = new Set(getCustomerOrders(customer.id).map(o => o.id));
  const finIds = new Set(getCustomerFinancing(customer.id).map(f => f.id));
  const payIds = new Set(state.payments.filter(p => p.customerId === customer.id).map(p => p.id));
  const myActivity = state.auditLog.filter(e =>
    e.targetId === customer.id ||
    e.actorName === customer.fullName ||
    (e.targetId != null && (orderIds.has(e.targetId) || finIds.has(e.targetId) || payIds.has(e.targetId)))
  );
  const available = customer.creditLimit - customer.usedCredit;
  const availablePercent = Math.round((available / customer.creditLimit) * 100);

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto p-3.5 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-800 text-[#0D2B45] mb-4 sm:mb-6">My Account</h1>

        {/* Profile header */}
        <div className="bg-[#0D2B45] rounded-2xl p-4 sm:p-6 mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="w-14 sm:w-16 h-14 sm:h-16 bg-[#1E7D3B] rounded-2xl flex items-center justify-center text-white font-800 text-xl sm:text-2xl shrink-0">
            {customer.fullName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-800 text-lg sm:text-xl truncate">{customer.fullName}</div>
            <div className="text-[#7DBE4C] font-500 text-xs sm:text-sm truncate">{customer.storeName}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/50 text-xs font-mono">{customer.accountNo}</span>
              <Badge variant={customer.status === 'active' ? 'green' : 'red'} size="sm">
                {customer.status === 'active' ? 'Active' : 'Suspended'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div className="col-span-12 sm:col-span-4 bg-[#1E7D3B] rounded-2xl p-3.5 sm:p-4">
            <div className="text-white/70 text-[11px] sm:text-xs font-600 uppercase tracking-wider">Available Credit</div>
            <div className="text-white font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(available)}</div>
            <div className="mt-2 bg-white/20 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full" style={{ width: `${availablePercent}%` }} />
            </div>
            <div className="text-white/60 text-[11px] mt-1">{availablePercent}% of {formatPHP(customer.creditLimit)}</div>
          </div>
          <div className="col-span-6 sm:col-span-4 bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E8E6]">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Credit Limit</div>
            <div className="text-[#0D2B45] font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(customer.creditLimit)}</div>
          </div>
          <div className="col-span-6 sm:col-span-4 bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E8E6]">
            <div className="text-[#65727A] text-[11px] sm:text-xs font-600 uppercase tracking-wider">Used Credit</div>
            <div className="text-[#10212B] font-800 text-xl sm:text-2xl mt-1 truncate">{formatPHP(customer.usedCredit)}</div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 mb-4">
          <div className="font-700 text-sm text-[#10212B] mb-3 sm:mb-4">Personal Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              ['Full Name', customer.fullName],
              ['Phone', customer.phone],
              ['Email', customer.email],
              ['Address', customer.address],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-[#65727A] mb-0.5">{label}</div>
                <div className="text-sm font-500 text-[#10212B] break-words">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Store info */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] p-4 sm:p-5 mb-4">
          <div className="font-700 text-sm text-[#10212B] mb-3 sm:mb-4">Store Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              ['Store Name', customer.storeName],
              ['Years Operating', `${customer.yearsOperating} years`],
              ['Store Address', customer.storeAddress],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-[#65727A] mb-0.5">{label}</div>
                <div className="text-sm font-500 text-[#10212B] break-words">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Account activity */}
        <div className="bg-white rounded-2xl border border-[#E4E8E6] p-5 mb-6 shadow-soft-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="font-700 text-sm text-[#10212B]">Account Activity</div>
            <span className="text-[11px] text-[#65727A]">{myActivity.length} event{myActivity.length !== 1 ? 's' : ''}</span>
          </div>
          <AuditTrail entries={myActivity} showFilters={false} pageSize={6} emptyLabel="No account activity yet." />
        </div>

        <button onClick={logout} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
    </CustomerLayout>
  );
}
