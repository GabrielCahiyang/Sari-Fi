import { useState } from 'react';
import logo from '../imports/image-1.png';
import { useApp } from '../context/AppContext';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1759860002165-f059bfcee759?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYXJpLXNhcmklMjBzdG9yZSUyMHBoaWxpcHBpbmVzJTIwZ3JvY2VyeSUyMG1hcmtldHxlbnwxfHx8fDE3ODgzNzI1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080';
const STORE_IMAGE = 'https://images.unsplash.com/photo-1759774289306-36f0cdb59bc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxzYXJpLXNhcmklMjBzdG9yZSUyMHBoaWxpcHBpbmVzJTIwZ3JvY2VyeSUyMG1hcmtldHxlbnwxfHx8fDE3ODgzNzI1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080';
const OWNER_IMAGE = 'https://images.unsplash.com/photo-1687422808311-a776f467a468?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxzbWFsbCUyMGJ1c2luZXNzJTIwd29tYW4lMjBlbnRyZXByZW5ldXIlMjBzdG9yZSUyMG93bmVyfGVufDF8fHx8MTc4ODM3MjU2MHww&ixlib=rb-4.1.0&q=80&w=1080';

const STEPS = [
  {
    number: '01',
    title: 'Apply In Person',
    description: 'Visit any Sari-Fi branch. Our staff records your personal and store information during your application.',
  },
  {
    number: '02',
    title: 'Get Approved',
    description: 'Our team reviews your application. Approved applicants receive a personal Sari-Fi account with a starting credit line.',
  },
  {
    number: '03',
    title: 'Shop & Finance',
    description: 'Log in, browse wholesale inventory, and choose how to pay — full, financed, or split.',
  },
];

const BENEFITS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Revolving Credit',
    description: 'As you repay, your available credit restores automatically. One approval, ongoing access.',
    color: 'bg-[#1E7D3B] text-white',
    textMuted: 'text-white/70',
    iconColor: 'text-white',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: 'Wholesale Prices',
    description: 'Access 30+ product lines at wholesale prices — direct to your store, no middleman.',
    color: 'bg-white border border-[#E4E8E6]',
    textMuted: 'text-[#65727A]',
    iconColor: 'text-[#1E7D3B]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Flexible Payment',
    description: 'Pay in full, use Sari-Fi financing, or split your payment between credit and cash or GCash.',
    color: 'bg-white border border-[#E4E8E6]',
    textMuted: 'text-[#65727A]',
    iconColor: 'text-[#1E7D3B]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Credit Growth',
    description: 'Each completed financing cycle can increase your limit by ₱1,000 — up to ₱20,000.',
    color: 'bg-[#0D2B45] text-white',
    textMuted: 'text-white/70',
    iconColor: 'text-[#7DBE4C]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Weekly Installments',
    description: 'Choose a 1-month or 2-month plan with equal weekly installments that fit your cash flow.',
    color: 'bg-[#FFF8E1] border border-[#FFC107]/30',
    textMuted: 'text-[#65727A]',
    iconColor: 'text-[#B8860B]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'GCash Ready',
    description: 'Pay installments or orders via GCash — instant confirmation, no queuing at the counter.',
    color: 'bg-white border border-[#E4E8E6]',
    textMuted: 'text-[#65727A]',
    iconColor: 'text-[#1E7D3B]',
  },
];

const REQUIREMENTS = [
  'Registered or established sari-sari store',
  'Valid government-issued ID',
  'Proof of business address',
  'At least 6 months in operation',
];

const LIMIT = 5000;
const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

export function HomePage() {
  const { navigate } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Revolving credit demo
  const [used, setUsed] = useState(4000);
  const availPct = Math.round(((LIMIT - used) / LIMIT) * 100);

  // Financing calculator
  const [principal, setPrincipal] = useState(5000);
  const [planMonths, setPlanMonths] = useState<1 | 2>(2);
  const [paidWeeks, setPaidWeeks] = useState(1);
  const weeks = planMonths * 4;
  const paid = Math.min(paidWeeks, weeks);
  const charge = principal * 0.2;
  const total = principal + charge;
  const perWeek = total / weeks;

  return (
    <div className="min-h-full bg-[#F7F8F6] font-sans">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E4E8E6]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logo} alt="Sari-Fi" className="h-9 object-contain" />

          <div className="hidden md:flex items-center gap-6 text-sm font-500 text-[#65727A]">
            <a href="#how-it-works" className="hover:text-[#0D2B45] transition-colors">How It Works</a>
            <a href="#benefits" className="hover:text-[#0D2B45] transition-colors">Why Sari-Fi</a>
            <a href="#calculator" className="hover:text-[#0D2B45] transition-colors">Calculator</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('login')}
              className="hidden sm:block text-sm font-600 text-[#65727A] hover:text-[#0D2B45] transition-colors px-3 py-2"
            >
              Staff Portal
            </button>
            <button
              onClick={() => navigate('customer/login')}
              className="px-4 py-2 bg-[#1E7D3B] hover:bg-[#22913f] text-white text-sm font-700 rounded-xl transition-all shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5 active:translate-y-0"
            >
              Customer Login
            </button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="md:hidden w-9 h-9 -mr-1 flex items-center justify-center rounded-lg text-[#0D2B45] hover:bg-[#0D2B45]/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden border-t border-[#E4E8E6] transition-[max-height,opacity] duration-300 ${menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-6 py-3 flex flex-col text-sm font-600 text-[#0D2B45]">
            {[
              { href: '#how-it-works', label: 'How It Works' },
              { href: '#benefits', label: 'Why Sari-Fi' },
              { href: '#calculator', label: 'Calculator' },
            ].map(l => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className="py-2.5 hover:text-[#1E7D3B] transition-colors">{l.label}</a>
            ))}
            <button onClick={() => { setMenuOpen(false); navigate('login'); }}
              className="py-2.5 text-left text-[#65727A] hover:text-[#0D2B45] transition-colors">Staff Portal</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Sari-sari store interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D2B45]/95 via-[#0D2B45]/80 to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36">
          <div className="max-w-xl">

            <h1 className="text-4xl md:text-6xl font-800 text-white leading-[1.05] tracking-tight mb-5">
              Financing Your Stock,<br />
              <span className="text-gradient-green">Growing</span><br />
              Your Business.
            </h1>

            <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-md">
              Sari-Fi helps sari-sari store owners access the inventory they need — without relying on high-interest informal lenders. Repay weekly, grow your limit, keep your shelves full.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('customer/login')}
                className="px-7 py-3.5 bg-[#1E7D3B] hover:bg-[#22913f] text-white font-700 text-sm rounded-xl transition-all shadow-lg shadow-[#1E7D3B]/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                Sign In to Your Account
              </button>
              <a
                href="#apply"
                className="px-7 py-3.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-600 text-sm rounded-xl transition-all border border-white/20 text-center"
              >
                How to Apply
              </a>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative bg-white/10 backdrop-blur-md border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '₱5,000', label: 'Starting Credit' },
                { value: '30+', label: 'Product Lines' },
                { value: '20%', label: 'Finance Charge' },
                { value: '₱20,000', label: 'Max Credit Limit' },
              ].map(stat => (
                <div key={stat.label} className="group text-center sm:border-l sm:border-white/10 sm:first:border-l-0 transition-transform duration-300 hover:-translate-y-0.5">
                  <div className="text-white font-800 text-2xl tnum group-hover:text-[#7DBE4C] transition-colors">{stat.value}</div>
                  <div className="text-white/50 text-xs mt-0.5 tracking-tight">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <h2 className="text-3xl font-800 text-[#0D2B45]">How Sari-Fi Works</h2>
            <p className="text-[#65727A] mt-3 max-w-md text-sm leading-relaxed">
              From application to your first order in three clear steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => {
              const active = activeStep === i;
              return (
                <div key={step.number} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[calc(100%-1px)] w-full h-px border-t-2 border-dashed border-[#E4E8E6] z-0" />
                  )}
                  <button
                    onClick={() => setActiveStep(i)}
                    onMouseEnter={() => setActiveStep(i)}
                    className={`card-lift relative w-full text-left rounded-2xl border p-7 transition-all duration-300 ${
                      active
                        ? 'bg-white border-[#1E7D3B]/40 shadow-soft-lg ring-1 ring-[#1E7D3B]/10'
                        : 'bg-white border-[#E4E8E6] shadow-soft-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ring-1 ring-white/5 shadow-soft-sm transition-colors duration-300 ${
                      active ? 'bg-gradient-to-br from-[#1E7D3B] to-[#0D2B45]' : 'bg-gradient-to-br from-[#1a3d5c] to-[#0D2B45]'
                    }`}>
                      <span className="text-[#7DBE4C] font-800 text-sm tnum">{step.number}</span>
                    </div>
                    <h3 className="font-800 text-base text-[#10212B] mb-2">{step.title}</h3>
                    <p className="text-sm text-[#65727A] leading-relaxed">{step.description}</p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Revolving credit explainer ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              <img
                src={STORE_IMAGE}
                alt="Store with products behind wire mesh"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-5 bg-[#1E7D3B] text-white rounded-2xl p-4 shadow-xl min-w-[200px]">
              <div className="text-white/70 text-[10px] font-600 uppercase tracking-widest mb-1">Available Credit</div>
              <div className="text-white font-800 text-2xl tnum">{peso(LIMIT - used)}</div>
              <div className="mt-2 bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div className="bg-white h-1.5 rounded-full transition-all duration-300" style={{ width: `${availPct}%` }} />
              </div>
              <div className="text-white/60 text-[10px] mt-1 tnum">{availPct}% available · {peso(used)} in use</div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-800 text-[#0D2B45] leading-tight mb-4">
              Credit That Restores<br />As You Repay
            </h2>
            <p className="text-[#65727A] text-sm leading-relaxed mb-6">
              Unlike a one-time loan, Sari-Fi gives you a revolving credit line. Every peso you repay is immediately returned to your available credit — so you can restock again without waiting for a new approval.
            </p>

            {/* Interactive slider */}
            <div className="bg-[#F7F8F6] border border-[#E4E8E6] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-700 text-[#65727A] uppercase tracking-widest">Try it — drag to spend</span>
                <span className="text-sm font-800 text-[#1E7D3B] tnum">{peso(used)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={LIMIT}
                step={500}
                value={used}
                onChange={e => setUsed(Number(e.target.value))}
                className="w-full accent-[#1E7D3B] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#65727A] mt-1 tnum">
                <span>₱0</span><span>{peso(LIMIT)} limit</span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: `Use ${peso(used)} of your ${peso(LIMIT)} limit`, sub: `Available credit: ${peso(LIMIT - used)}` },
                { label: 'Pay your first weekly installment', sub: 'Credit restores proportionally' },
                { label: 'Shop again before the cycle ends', sub: 'Revolving — always accessible' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#1E7D3B]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#1E7D3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-600 text-[#10212B] tnum">{item.label}</div>
                    <div className="text-xs text-[#65727A] mt-0.5 tnum">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits Bento ── */}
      <section id="benefits" className="py-20 px-6 bg-[#F7F8F6]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <h2 className="text-3xl font-800 text-[#0D2B45]">Why Sari-Fi</h2>
            <p className="text-[#65727A] mt-3 max-w-sm text-sm leading-relaxed">
              Everything a sari-sari store owner needs to keep shelves stocked and business growing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map(b => (
              <div key={b.title} className={`card-lift rounded-2xl p-6 ${b.color} ${b.color.includes('border') ? 'shadow-soft-sm' : 'lit-top'}`}>
                <div className={`mb-4 inline-flex items-center justify-center w-11 h-11 rounded-xl ${b.color.includes('text-white') ? 'bg-white/10' : 'bg-[#1E7D3B]/8'} ${b.iconColor}`}>
                  {b.icon}
                </div>
                <h3 className={`font-700 text-base mb-2 ${b.color.includes('text-white') ? 'text-white' : 'text-[#10212B]'}`}>
                  {b.title}
                </h3>
                <p className={`text-sm leading-relaxed ${b.textMuted}`}>
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Can Apply ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-800 text-[#0D2B45] mb-5">Who Can Apply?</h2>
            <p className="text-sm text-[#65727A] leading-relaxed mb-7">
              Sari-Fi is exclusively for sari-sari store owners. Applications are processed in person at any Sari-Fi branch — there is no online registration.
            </p>
            <div className="space-y-3 mb-8">
              {REQUIREMENTS.map(r => (
                <div key={r} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[#1E7D3B] rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-[#10212B] font-500">{r}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <span className="font-700">Note:</span> Sari-Fi does not offer online registration. Visit a branch to start your application.
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[3/4]">
              <img
                src={OWNER_IMAGE}
                alt="Store owner at counter"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute top-5 -left-5 bg-white rounded-2xl p-4 shadow-xl border border-[#E4E8E6]">
              <div className="text-xs text-[#65727A] mb-0.5">Starting limit</div>
              <div className="text-[#0D2B45] font-800 text-xl">₱5,000</div>
              <div className="text-xs text-[#7DBE4C] font-600 mt-1">↑ Grows with every cycle</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Financing calculator ── */}
      <section id="calculator" className="py-20 px-6 bg-[#0D2B45]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-800 text-white">How the Financing Works</h2>
            <p className="text-white/60 mt-3 text-sm max-w-sm">
              A simple, transparent calculation with no hidden fees. Adjust the amount and plan to see your schedule.
            </p>
          </div>

          {/* Controls */}
          <div className="max-w-3xl bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs font-700 uppercase tracking-widest">Amount to Finance</span>
                  <span className="text-white font-800 text-lg tnum">{peso(principal)}</span>
                </div>
                <input
                  type="range" min={1000} max={LIMIT} step={500}
                  value={principal}
                  onChange={e => setPrincipal(Number(e.target.value))}
                  className="w-full accent-[#7DBE4C] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1 tnum">
                  <span>₱1,000</span><span>{peso(LIMIT)}</span>
                </div>
              </div>
              <div className="flex rounded-xl bg-white/10 p-1 shrink-0">
                {([1, 2] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPlanMonths(m)}
                    className={`px-4 py-2 rounded-lg text-xs font-700 transition-all ${
                      planMonths === m ? 'bg-[#1E7D3B] text-white shadow-soft-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {m}-Month
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
            {[
              { label: 'Principal', value: peso(principal), sub: 'Amount borrowed' },
              { label: 'Finance Charge (20%)', value: peso(charge), sub: 'One-time, applied upfront' },
              { label: 'Total Repayable', value: peso(total), sub: `${weeks} weeks × ${peso(perWeek)}` },
            ].map(card => (
              <div key={card.label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 text-center">
                <div className="text-white/50 text-xs font-600 mb-2">{card.label}</div>
                <div className="text-white font-800 text-2xl mb-1 tnum">{card.value}</div>
                <div className="text-white/40 text-xs tnum">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 max-w-3xl bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white/50 text-xs font-700 uppercase tracking-widest">Repayment Schedule · tap to mark paid</div>
              <button
                onClick={() => setPaidWeeks(0)}
                className="text-white/40 hover:text-white text-xs font-600 transition-colors"
              >
                Reset
              </button>
            </div>
            <div className={`grid grid-cols-4 gap-2 ${weeks > 4 ? 'md:grid-cols-8' : 'md:grid-cols-4'}`}>
              {Array.from({ length: weeks }, (_, i) => {
                const isPaid = i < paid;
                return (
                  <button
                    key={i}
                    onClick={() => setPaidWeeks(isPaid ? i : i + 1)}
                    className={`rounded-xl p-2 text-center transition-all duration-200 hover:-translate-y-0.5 ${
                      isPaid ? 'bg-[#1E7D3B] shadow-soft-sm' : 'bg-white/8 border border-white/10 hover:bg-white/15'
                    }`}
                  >
                    <div className="text-[10px] text-white/50 mb-1">Wk {i + 1}</div>
                    <div className={`text-xs font-700 tnum ${isPaid ? 'text-white' : 'text-white/70'}`}>{peso(perWeek)}</div>
                    <div className={`text-[9px] mt-0.5 ${isPaid ? 'text-white/70' : 'text-transparent'}`}>Paid</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#7DBE4C] h-1.5 rounded-full transition-all duration-300" style={{ width: `${(paid / weeks) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs mt-1.5 tnum">
              <span className="text-white/30">{paid} of {weeks} installments paid</span>
              <span className="text-[#7DBE4C] font-600">{peso(total - paid * perWeek)} remaining</span>
            </div>
          </div>
        </div>
      </section>


      {/* ── Footer ── */}
      <footer className="bg-[#0A2138] border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2 flex flex-col gap-4">
              <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                Financing Your Stock, Growing Your Business. Empowering sari-sari store owners with accessible micro-inventory financing.
              </p>
            </div>
            {/* Platform */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-700 text-white/30 uppercase tracking-widest">Platform</span>
              <button onClick={() => navigate('customer/login')} className="text-sm text-white/60 hover:text-white transition-colors text-left">Customer Portal</button>
              <button onClick={() => navigate('login')} className="text-sm text-white/60 hover:text-white transition-colors text-left">Staff Portal</button>
              <button onClick={() => navigate('customer/login')} className="text-sm text-white/60 hover:text-white transition-colors text-left">Apply for Financing</button>
            </div>
            {/* Contact */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-700 text-white/30 uppercase tracking-widest">Contact</span>
              <a href="mailto:support@sari-fi.ph" className="text-sm text-white/60 hover:text-white transition-colors">support@sari-fi.ph</a>
              <a href="tel:+639170000000" className="text-sm text-white/60 hover:text-white transition-colors">+63 917 000 0000</a>
              <span className="text-sm text-white/60">Metro Manila, Philippines</span>
            </div>
          </div>
          <div className="border-t border-white/[0.07] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-xs text-white/30">&copy; {new Date().getFullYear()} Sari-Fi. All rights reserved.</span>
            <div className="flex items-center gap-5 text-xs text-white/30">
              {['Privacy Policy', 'Terms of Service', 'BSP Disclosure'].map(l => (
                <button key={l} className="hover:text-white transition-colors">{l}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
