import logo from '../../assets/sarifi-logo.png';
import { useApp } from '../../context/AppContext';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', page: 'customer/dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { label: 'Shop', page: 'customer/shop', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { label: 'Orders', page: 'customer/orders', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
  { label: 'Financing', page: 'customer/financing', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { label: 'Payments', page: 'customer/payments', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
  { label: 'Account', page: 'customer/account', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
];

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const { state, navigate, logout, getCurrentCustomer } = useApp();
  const customer = getCurrentCustomer();
  const cartCount = state.cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-[#F7F8F6] relative">
      {/* Top bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#E4E8E6] px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Sari-Fi" className="h-7 sm:h-8 object-contain cursor-pointer" onClick={() => navigate('customer/dashboard')} />
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_ITEMS.map(item => {
              const active = state.currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => navigate(item.page)}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-500 transition-all duration-200 cursor-pointer ${active ? 'bg-[#0D2B45]/[0.05] text-[#0D2B45] font-600' : 'text-[#65727A] hover:text-[#0D2B45] hover:bg-[#F7F8F6]'}`}
                >
                  <span className={`transition-colors ${active ? 'text-[#1E7D3B]' : 'group-hover:text-[#1E7D3B]'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                  {active && <span className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[#1E7D3B]" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart */}
          <button
            onClick={() => navigate('customer/cart')}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${state.currentPage === 'customer/cart' ? 'bg-[#1E7D3B] text-white shadow-sm shadow-[#1E7D3B]/20' : 'text-[#65727A] hover:bg-[#F7F8F6] hover:text-[#0D2B45]'}`}
            title="Cart"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FFC107] rounded-full text-[10px] font-800 text-[#0D2B45] flex items-center justify-center ring-2 ring-white tnum animate-scale-in">
                {cartCount}
              </span>
            )}
          </button>

          {/* Account */}
          <button
            onClick={() => navigate('customer/account')}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-[#F7F8F6] transition-colors"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-[#1a3d5c] to-[#0D2B45] rounded-xl flex items-center justify-center text-white font-700 text-xs ring-1 ring-black/5">
              {customer?.fullName.charAt(0) || '?'}
            </div>
            <span className="text-sm font-600 text-[#10212B] hidden sm:block truncate max-w-[120px]">
              {customer?.fullName.split(' ')[0]}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="text-[#65727A] hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
            title="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div key={state.currentPage} className="animate-fade-up min-h-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E4E8E6] z-40 px-1 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map(item => {
          const active = state.currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] ${
                active ? 'text-[#1E7D3B]' : 'text-[#65727A] hover:text-[#0D2B45]'
              }`}
            >
              <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] mt-0.5 tracking-tight ${active ? 'font-700' : 'font-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
