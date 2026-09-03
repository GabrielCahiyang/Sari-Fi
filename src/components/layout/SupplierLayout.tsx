import { useState } from 'react';
import logo from '../../assets/sarifi-logo.png';
import { useApp } from '../../context/AppContext';

interface NavItem {
  label: string;
  page: string;
  icon: React.ReactNode;
  badge?: number;
}

export function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { state, navigate, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const supplier = state.suppliers.find(s => s.id === state.currentUser?.supplierId) || {
    id: state.currentUser?.supplierId || 'sup1',
    name: state.currentUser?.name || 'Wholesale Supplier',
    email: state.currentUser?.email || 'supplier@sarifi.ph',
    status: 'active' as const,
  };

  const myProducts = state.products.filter(p => p.supplierId === supplier.id);
  const lowStockCount = myProducts.filter(p => p.stock <= p.reorderLevel).length;

  // Filter orders that have items from this supplier
  const supplierOrders = state.orders.filter(o =>
    ['processing', 'ready', 'out_for_delivery'].includes(o.status) &&
    o.items.some(it => myProducts.some(p => p.id === it.productId))
  );
  const pendingFulfillCount = supplierOrders.filter(
    o => o.status === 'processing' || o.status === 'ready' || o.status === 'out_for_delivery'
  ).length;

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      page: 'supplier/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Products',
      page: 'supplier/products',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      badge: myProducts.length,
    },
    {
      label: 'Inventory',
      page: 'supplier/inventory',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      label: 'Restock',
      page: 'supplier/restock',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      label: 'Orders to Fulfill',
      page: 'supplier/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      badge: pendingFulfillCount > 0 ? pendingFulfillCount : undefined,
    },
    {
      label: 'Account & Payouts',
      page: 'supplier/account',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  const handleNav = (page: string) => {
    navigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] flex flex-col md:flex-row font-sans">
      {/* ── Mobile Top Header ── */}
      <div className="md:hidden bg-white border-b border-[#E4E8E6] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1 rounded-lg text-[#0D2B45] hover:bg-[#F7F8F6] cursor-pointer"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src={logo} alt="Sari-Fi" className="h-7 object-contain" />
          <span className="text-[10px] font-700 uppercase tracking-widest bg-[#0D2B45] text-[#FFC107] px-2 py-0.5 rounded-md">
            Supplier
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="text-xs font-600 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer Backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-[#E4E8E6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Sari-Fi" className="h-7 object-contain" />
            <span className="text-[10px] font-700 uppercase tracking-widest bg-[#0D2B45] text-[#FFC107] px-2 py-0.5 rounded-md">
              Supplier
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-[#65727A] hover:bg-[#F7F8F6] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 border-b border-[#E4E8E6] bg-[#F7F8F6]">
          <div className="font-700 text-sm text-[#0D2B45] truncate">{supplier.name}</div>
          <div className="text-xs text-[#65727A] truncate">{supplier.email}</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(item => {
            const active = state.currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleNav(item.page)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-600 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0D2B45] text-white shadow-xs'
                    : 'text-[#4A5568] hover:bg-[#F0F2F1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={active ? 'text-[#FFC107]' : 'text-[#65727A]'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-[#0D2B45]/10 text-[#0D2B45]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E4E8E6]">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-600 text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0D2B45] text-white shrink-0 border-r border-[#1B3B5A]">
        {/* Brand */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Sari-Fi" className="h-8 object-contain" />
            <div>
              <div className="text-sm font-800 text-white tracking-tight leading-tight">Sari-Fi</div>
              <div className="text-[10px] font-700 text-[#FFC107] uppercase tracking-wider">
                Supplier Portal
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Profile Card */}
        <div className="px-4 py-3.5 mx-3 my-4 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1E7D3B] text-white flex items-center justify-center font-800 text-sm shadow-xs">
              {supplier.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-700 text-white truncate">{supplier.name}</div>
              <div className="text-[11px] text-white/60 truncate">{supplier.email}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => {
            const active = state.currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleNav(item.page)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-600 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1E7D3B] text-white shadow-sm'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={active ? 'text-white' : 'text-white/60'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${
                    active ? 'bg-white text-[#1E7D3B]' : 'bg-white/15 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-600 text-white/70 hover:bg-white/10 hover:text-red-300 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
