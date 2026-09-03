import { useState } from 'react';
import logo from '../../imports/image-1.png';
import { useApp } from '../../context/AppContext';

interface NavItem {
  label: string;
  page: string;
  icon: React.ReactNode;
}

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  customers: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  orders: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  payments: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  financing: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  products: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  inventory: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>,
  restock: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  suppliers: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>,
  employees: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  reports: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  audit: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  pos: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4h14l1 4H4l1-4zM4 8h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8zm5 5h6" /></svg>,
};

function buildNav(role: string): { sections: { label?: string; items: NavItem[] }[] } {
  const ops: NavItem[] = [
    { label: 'Customers', page: `${role}/customers`, icon: iconMap.customers },
    { label: 'Suppliers', page: `${role}/suppliers`, icon: iconMap.suppliers },
    { label: 'Orders', page: `${role}/orders`, icon: iconMap.orders },
    { label: 'Payments', page: `${role}/payments`, icon: iconMap.payments },
    { label: 'Financing', page: `${role}/financing`, icon: iconMap.financing },
  ];
  const mgmt: NavItem[] = [
    { label: 'Employees', page: `${role}/employees`, icon: iconMap.employees },
    { label: 'Reports', page: `${role}/reports`, icon: iconMap.reports },
    { label: 'Audit Trail', page: `${role}/audit`, icon: iconMap.audit },
    { label: 'Settings', page: `${role}/settings`, icon: iconMap.settings },
  ];

  if (role === 'employee') {
    return { sections: [
      { items: [
        { label: 'Dashboard', page: 'employee/dashboard', icon: iconMap.dashboard },
        { label: 'Point of Sale', page: 'employee/pos', icon: iconMap.pos },
      ] },
      { label: 'Operations', items: [
        { label: 'Customers', page: 'employee/customers', icon: iconMap.customers },
        { label: 'Orders', page: 'employee/orders', icon: iconMap.orders },
        { label: 'Payments', page: 'employee/payments', icon: iconMap.payments },
      ]},
    ]};
  }
  if (role === 'supervisor') {
    return { sections: [
      { items: [
        { label: 'Dashboard', page: 'supervisor/dashboard', icon: iconMap.dashboard },
        { label: 'Point of Sale', page: 'supervisor/pos', icon: iconMap.pos },
      ] },
      { label: 'Operations', items: ops.filter(o => o.label !== 'Suppliers').map(o => ({ ...o, page: o.page.replace(`${role}/`, 'supervisor/') })) },
      { label: 'Oversight', items: [
        { label: 'Audit Trail', page: 'supervisor/audit', icon: iconMap.audit },
      ]},
    ]};
  }
  return { sections: [
    { items: [{ label: 'Dashboard', page: 'admin/dashboard', icon: iconMap.dashboard }] },
    { label: 'Operations', items: ops },
    { label: 'Management', items: mgmt },
  ]};
}

interface InternalLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function InternalLayout({ children, title }: InternalLayoutProps) {
  const { state, navigate, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const role = state.currentUser?.role || 'employee';
  const nav = buildNav(role);

  const pendingCashCount = state.payments.filter(p => p.status === 'pending' && p.method === 'cash').length;
  const pendingFinancingCount = state.financing.filter(f => f.status === 'pending').length;

  return (
    <div className="flex h-screen w-full bg-[#F7F8F6] relative overflow-hidden print:h-auto print:overflow-visible print:bg-white print:block">
      {/* Mobile Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-[#0D2B45]/60 backdrop-blur-xs z-40 md:hidden transition-opacity print:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-gradient-to-b from-[#0D2B45] to-[#0a2237] text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-soft-lg z-50
          fixed inset-y-0 left-0 ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:z-10
          ${sidebarOpen ? 'w-64' : 'w-64 md:w-16'} shrink-0 print:hidden`}
      >
        {/* Logo & Mobile Close */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          {(sidebarOpen || mobileDrawerOpen) ? (
            <div>
              <div className="bg-white rounded-xl px-3 py-2 inline-block">
                <img src={logo} alt="Sari-Fi" className="h-7 object-contain" />
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-2 px-1">
                {role === 'admin' ? 'Admin Portal' : role === 'supervisor' ? 'Supervisor' : 'Employee'}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-1.5 flex items-center justify-center">
              <img src={logo} alt="Sari-Fi" className="w-8 h-8 object-contain" />
            </div>
          )}

          {/* Close button inside mobile drawer */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="md:hidden text-white/60 hover:text-white p-2 rounded-lg"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {nav.sections.map((section, si) => (
            <div key={si} className={si > 0 ? 'mt-4' : ''}>
              {section.label && (sidebarOpen || mobileDrawerOpen) && (
                <div className="text-[10px] font-700 text-white/40 uppercase tracking-widest px-2 mb-1">{section.label}</div>
              )}
              {section.items.map(item => {
                const active = state.currentPage === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => {
                      navigate(item.page);
                      setMobileDrawerOpen(false);
                    }}
                    className={`group relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-500 transition-all duration-200 cursor-pointer ${active ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-white/55 hover:bg-white/[0.07] hover:text-white'}`}
                  >
                    {/* Active accent bar */}
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-[#7DBE4C] transition-all duration-200 ${active ? 'h-5 opacity-100' : 'h-0 opacity-0'}`} />
                    <span className={`shrink-0 transition-colors ${active ? 'text-[#7DBE4C]' : 'text-white/55 group-hover:text-[#7DBE4C]'}`}>{item.icon}</span>
                    {(sidebarOpen || mobileDrawerOpen) && <span className="truncate">{item.label}</span>}
                    {(sidebarOpen || mobileDrawerOpen) && item.label === 'Financing' && pendingFinancingCount > 0 && (role === 'supervisor' || role === 'admin') && (
                      <span className="ml-auto bg-[#FFC107] text-[#0D2B45] text-[10px] font-800 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-md tnum">{pendingFinancingCount}</span>
                    )}
                    {(sidebarOpen || mobileDrawerOpen) && item.label === 'Payments' && pendingCashCount > 0 && (
                      <span className="ml-auto bg-[#FFC107] text-[#0D2B45] text-[10px] font-800 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-md tnum">{pendingCashCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#22913f] to-[#1E7D3B] rounded-xl flex items-center justify-center shrink-0 text-white font-700 text-sm ring-1 ring-white/10 shadow-soft-sm">
              {state.currentUser?.name.charAt(0)}
            </div>
            {(sidebarOpen || mobileDrawerOpen) && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-600 text-white truncate">{state.currentUser?.name}</div>
                <div className="text-[11px] text-white/50 capitalize">{role}</div>
              </div>
            )}
            {(sidebarOpen || mobileDrawerOpen) && (
              <button onClick={logout} className="text-white/40 hover:text-white transition-colors p-1 cursor-pointer" title="Sign Out">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Topbar */}
        <header className="flex items-center gap-3 sm:gap-4 px-3.5 sm:px-6 py-3 sm:py-4 bg-white/80 backdrop-blur-md border-b border-[#E4E8E6] shrink-0 z-[5] print:hidden">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden text-[#65727A] hover:text-[#0D2B45] hover:bg-[#F7F8F6] p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block text-[#65727A] hover:text-[#0D2B45] hover:bg-[#F7F8F6] -ml-1.5 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {title && <h1 className="text-base sm:text-lg font-800 text-[#10212B] tracking-tight truncate">{title}</h1>}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {(role === 'supervisor' || role === 'admin') && pendingFinancingCount > 0 && (
              <button
                onClick={() => navigate(`${role}/financing`)}
                className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-700 text-amber-800 bg-amber-50 ring-1 ring-amber-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">{pendingFinancingCount} Pending Financing</span>
                <span className="sm:hidden">{pendingFinancingCount} Pending</span>
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 print:p-0 print:overflow-visible print:h-auto print:block">
          <div key={state.currentPage} className="animate-fade-up print:animate-none print:transform-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
