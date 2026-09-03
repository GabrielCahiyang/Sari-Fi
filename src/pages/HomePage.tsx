import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, type Variants } from 'motion/react';
import logo from '../imports/image-1.png';
import { useApp } from '../context/AppContext';
import { useTour } from '../context/TourContext';

interface BenefitItem {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  textMuted: string;
  iconColor: string;
}

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

function getBenefits(settings: any, productsCount: number): BenefitItem[] {
  const limitInc = settings?.limitIncreaseAmount || 1000;
  const maxLimit = settings?.maxAutomaticLimit || 20000;
  const plan1Weeks = settings?.plan1Installments || 4;
  const plan2Weeks = settings?.plan2Installments || 8;

  return [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Revolving Credit',
      description: 'As you repay, your available credit restores automatically. One approval, ongoing access.',
      color: 'bg-[#1E7D3B] text-white',
      textMuted: 'text-white/80',
      iconColor: 'text-white',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: 'Wholesale Prices',
      description: `Access ${productsCount || 30}+ product lines at wholesale prices — direct to your store, no middleman.`,
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
      description: `Each completed financing cycle can increase your limit by ${peso(limitInc)} — up to ${peso(maxLimit)}.`,
      color: 'bg-[#0D2B45] text-white',
      textMuted: 'text-white/80',
      iconColor: 'text-[#7DBE4C]',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Weekly Installments',
      description: `Choose a 1-month (${plan1Weeks} wks) or 2-month (${plan2Weeks} wks) plan with equal weekly installments that fit your cash flow.`,
      color: 'bg-[#FFF9E6] border border-[#FFD54F]/40',
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
}

const REQUIREMENTS = [
  'Registered or established sari-sari store',
  'Valid government-issued ID',
  'Proof of business address / store presence',
  'At least 6 months in active operation',
];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export function HomePage() {
  const { navigate, state } = useApp();
  const { startTour } = useTour();
  const settings = state.settings;
  const LIMIT = settings?.startingCreditLimit || 5000;
  const MAX_LIMIT = settings?.maxAutomaticLimit || 20000;
  const LIMIT_INC = settings?.limitIncreaseAmount || 1000;
  const CHARGE_PCT = settings?.financingCharge ?? 2;
  const PLAN1_WEEKS = settings?.plan1Installments || 4;
  const PLAN2_WEEKS = settings?.plan2Installments || 8;

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Dynamic Scroll Progress Tracking
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const body = document.body;
      const winScroll = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
      const scrollHeight = Math.max(
        doc.scrollHeight,
        body.scrollHeight,
        doc.offsetHeight,
        body.offsetHeight
      ) - window.innerHeight;

      if (scrollHeight > 0) {
        const scrolled = Math.min(1, Math.max(0, winScroll / scrollHeight));
        setScrollProgress(scrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const { scrollY } = useScroll();
  const heroParallaxY = useTransform(scrollY, [0, 600], [0, 120]);

  // Revolving credit demo
  const [used, setUsed] = useState(Math.min(3500, Math.round(LIMIT * 0.7)));
  const availPct = Math.max(0, Math.round(((LIMIT - used) / LIMIT) * 100));

  // Financing calculator
  const [principal, setPrincipal] = useState(Math.min(5000, LIMIT));
  const [planMonths, setPlanMonths] = useState<1 | 2>(2);
  const weeks = planMonths === 1 ? PLAN1_WEEKS : PLAN2_WEEKS;
  const [paidWeeks, setPaidWeeks] = useState(2);
  const paid = Math.min(paidWeeks, weeks);
  const charge = Math.round(principal * (CHARGE_PCT / 100));
  const total = principal + charge;
  const perWeek = Math.round((total / weeks) * 100) / 100;
  const benefits = useMemo(() => getBenefits(settings, state.products.length), [settings, state.products.length]);

  return (
    <div className="min-h-full bg-[#F7F8F6] font-sans overflow-x-hidden selection:bg-[#1E7D3B] selection:text-white">
      {/* ── Scroll Progress Bar ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1E7D3B] via-[#7DBE4C] to-[#FFC107] z-50 pointer-events-none shadow-md shadow-[#1E7D3B]/40"
        style={{
          transformOrigin: '0% 50%',
        }}
        animate={{ scaleX: scrollProgress }}
        transition={{ type: 'spring', stiffness: 400, damping: 40, mass: 0.15 }}
      />

      {/* ── Sticky Navbar ── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E4E8E6]"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer"
          >
            <img src={logo} alt="Sari-Fi" className="h-9 object-contain" />
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm font-600 text-[#65727A]">
            <a href="#how-it-works" className="hover:text-[#0D2B45] hover:-translate-y-0.5 transition-all">How It Works</a>
            <a href="#revolving" className="hover:text-[#0D2B45] hover:-translate-y-0.5 transition-all">Revolving Credit</a>
            <a href="#benefits" className="hover:text-[#0D2B45] hover:-translate-y-0.5 transition-all">Why Sari-Fi</a>
            <a href="#calculator" className="hover:text-[#0D2B45] hover:-translate-y-0.5 transition-all">Calculator</a>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={startTour}
              className="flex items-center gap-1.5 text-xs font-800 uppercase tracking-wider text-[#1E7D3B] hover:text-[#165f2c] bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 text-[#1E7D3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Walkthrough</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('supplier/login')}
              className="hidden sm:block text-xs font-700 uppercase tracking-wider text-[#0D2B45] hover:text-[#1E7D3B] transition-colors px-3 py-2 cursor-pointer"
            >
              Supplier Portal
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('login')}
              className="hidden sm:block text-xs font-700 uppercase tracking-wider text-[#65727A] hover:text-[#0D2B45] transition-colors px-3 py-2 cursor-pointer"
            >
              Staff Portal
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('customer/login')}
              className="px-4 py-2 bg-[#1E7D3B] hover:bg-[#22913f] text-white text-sm font-700 rounded-xl transition-all shadow-sm shadow-[#1E7D3B]/20 cursor-pointer"
            >
              Customer Login
            </motion.button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="md:hidden w-9 h-9 -mr-1 flex items-center justify-center rounded-lg text-[#0D2B45] hover:bg-[#0D2B45]/5 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Animated Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden border-t border-[#E4E8E6] bg-white/95 backdrop-blur-md"
            >
              <div className="px-6 py-4 flex flex-col gap-2 text-sm font-600 text-[#0D2B45]">
                {[
                  { href: '#how-it-works', label: 'How It Works' },
                  { href: '#revolving', label: 'Revolving Credit' },
                  { href: '#benefits', label: 'Why Sari-Fi' },
                  { href: '#calculator', label: 'Calculator' },
                ].map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="py-2 hover:text-[#1E7D3B] transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    startTour();
                  }}
                  className="py-2 text-left font-800 text-[#1E7D3B] flex items-center gap-2 hover:underline transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[#1E7D3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>System Walkthrough</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('supplier/login');
                  }}
                  className="py-2 text-left font-700 text-[#0D2B45] hover:text-[#1E7D3B] transition-colors cursor-pointer"
                >
                  Supplier Portal
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('login');
                  }}
                  className="py-2 text-left text-[#65727A] hover:text-[#0D2B45] transition-colors cursor-pointer"
                >
                  Staff Portal
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('customer/login');
                  }}
                  className="py-2 text-left font-700 text-[#1E7D3B] hover:underline transition-colors cursor-pointer"
                >
                  Customer Login →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Hero Section (Clean, Spacious, No Mock Cards or Bubbles) ── */}
      <section className="relative overflow-hidden min-h-[540px] md:min-h-[620px] flex items-center">
        <motion.div
          style={{ y: heroParallaxY }}
          className="absolute inset-0 -top-24 -bottom-24 scale-105"
        >
          <img
            src={HERO_IMAGE}
            alt="Sari-sari store interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D2B45]/98 via-[#0D2B45]/85 to-[#0D2B45]/40" />
        </motion.div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36 w-full">
          <div className="max-w-2xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-4xl sm:text-5xl md:text-6xl font-900 text-white leading-[1.08] tracking-tight mb-6"
            >
              Financing Your Stock,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7DBE4C] via-[#9de46b] to-[#1E7D3B]">
                Growing
              </span><br />
              Your Business.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-white/80 text-base sm:text-lg leading-relaxed mb-8 max-w-lg"
            >
              Sari-Fi helps sari-sari store owners access the inventory they need — without relying on high-interest informal lenders. Repay weekly, grow your limit, keep your shelves full.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('customer/login')}
                className="px-8 py-4 bg-[#1E7D3B] hover:bg-[#22913f] text-white font-700 text-sm rounded-xl transition-all shadow-lg shadow-[#1E7D3B]/30 cursor-pointer text-center"
              >
                Sign In to Your Account
              </motion.button>
              <motion.a
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.96 }}
                href="#how-it-works"
                className="px-8 py-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-600 text-sm rounded-xl transition-all border border-white/20 text-center"
              >
                How It Works
              </motion.a>
            </motion.div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="absolute bottom-0 inset-x-0 bg-white/10 backdrop-blur-lg border-t border-white/15">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {[
                { value: peso(LIMIT), label: 'Starting Credit' },
                { value: `${state.products.length || 30}+`, label: 'Product Lines' },
                { value: `${CHARGE_PCT}%`, label: 'Finance Charge' },
                { value: peso(MAX_LIMIT), label: 'Max Credit Limit' },
              ].map(stat => (
                <motion.div
                  key={stat.label}
                  variants={fadeInUp}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className="text-center sm:border-l sm:border-white/10 sm:first:border-l-0 transition-all cursor-default"
                >
                  <div className="text-white font-900 text-2xl tracking-tight hover:text-[#7DBE4C] transition-colors">
                    {stat.value}
                  </div>
                  <div className="text-white/70 text-xs font-600 mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-900 text-[#0D2B45]">
              How Sari-Fi Works
            </h2>
            <p className="text-[#65727A] mt-3 max-w-md text-sm leading-relaxed">
              From application to your first order in three clear steps.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {STEPS.map((step, i) => {
              const active = activeStep === i;
              return (
                <motion.div
                  key={step.number}
                  variants={fadeInUp}
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => setActiveStep(i)}
                  className="relative cursor-pointer"
                >
                  <div
                    className={`h-full rounded-2xl border p-7 transition-all duration-300 relative overflow-hidden ${
                      active
                        ? 'bg-white border-[#1E7D3B] shadow-xl shadow-[#1E7D3B]/10 ring-2 ring-[#1E7D3B]/20'
                        : 'bg-white border-[#E4E8E6] shadow-sm hover:border-[#1E7D3B]/40'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeStepBorder"
                        className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1E7D3B] to-[#7DBE4C]"
                      />
                    )}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-900 text-sm mb-5 transition-all duration-300 ${
                        active
                          ? 'bg-gradient-to-br from-[#1E7D3B] to-[#0D2B45] text-[#7DBE4C] shadow-md shadow-[#1E7D3B]/30'
                          : 'bg-[#F7F8F6] text-[#65727A] border border-[#E4E8E6]'
                      }`}
                    >
                      {step.number}
                    </div>
                    <h3 className="font-800 text-lg text-[#10212B] mb-2">{step.title}</h3>
                    <p className="text-sm text-[#65727A] leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Revolving Credit Explainer & Interactive Simulator ── */}
      <section id="revolving" className="py-24 px-6 bg-white border-y border-[#E4E8E6] relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl border border-[#E4E8E6] relative group">
              <img
                src={STORE_IMAGE}
                alt="Store with products"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            {/* Live Indicator */}
            <div className="sm:absolute sm:-bottom-6 sm:-right-6 mt-4 sm:mt-0 bg-[#1E7D3B] text-white rounded-3xl p-4 sm:p-5 shadow-2xl w-full sm:w-auto sm:min-w-[240px] border border-white/20">
              <div className="text-white/70 text-[10px] font-700 uppercase tracking-widest mb-1">
                Available Credit
              </div>
              <div className="text-white font-900 text-2xl sm:text-3xl tnum">{peso(LIMIT - used)}</div>
              <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-white h-2 rounded-full"
                  animate={{ width: `${availPct}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              </div>
              <div className="text-white/80 text-xs mt-1.5 font-600 tnum flex justify-between">
                <span>{availPct}% Available</span>
                <span>{peso(used)} in use</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-900 text-[#0D2B45] leading-tight mb-4">
              Credit That Restores<br />As You Repay
            </h2>
            <p className="text-[#65727A] text-sm leading-relaxed mb-8">
              Unlike a one-time loan, Sari-Fi gives you a revolving credit line. Every peso you repay is immediately returned to your available credit — so you can restock again without waiting for a new approval.
            </p>

            {/* Interactive Slider Box */}
            <div className="bg-[#F7F8F6] border border-[#E4E8E6] rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-700 text-[#65727A] uppercase tracking-widest">
                  Try it — drag to spend
                </span>
                <span className="text-sm font-800 text-[#1E7D3B] tnum bg-white px-2.5 py-1 rounded-lg border border-[#E4E8E6]">
                  {peso(used)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={LIMIT}
                step={250}
                value={used}
                onChange={e => setUsed(Number(e.target.value))}
                className="w-full accent-[#1E7D3B] cursor-pointer h-2 bg-[#E4E8E6] rounded-lg"
              />
              <div className="flex justify-between text-xs text-[#65727A] mt-2 font-600 tnum">
                <span>₱0</span>
                <span className="text-[#1E7D3B]">{peso(LIMIT)} limit</span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: `Use ${peso(used)} of your ${peso(LIMIT)} limit`,
                  sub: `Available credit: ${peso(LIMIT - used)}`,
                },
                {
                  label: 'Pay your first weekly installment',
                  sub: 'Credit restores proportionally',
                },
                {
                  label: 'Shop again before the cycle ends',
                  sub: 'Revolving — always accessible',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-3.5 transition-transform"
                >
                  <div className="w-6 h-6 bg-[#1E7D3B] text-white rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-700 text-[#10212B]">{item.label}</div>
                    <div className="text-xs text-[#65727A] mt-0.5">{item.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Benefits Bento ── */}
      <section id="benefits" className="py-24 px-6 bg-[#F7F8F6]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-900 text-[#0D2B45]">
              Why Sari-Fi
            </h2>
            <p className="text-[#65727A] mt-3 text-sm leading-relaxed max-w-sm">
              Everything a sari-sari store owner needs to keep shelves stocked and business growing.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {benefits.map(b => (
              <motion.div
                key={b.title}
                variants={fadeInUp}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`rounded-3xl p-7 flex flex-col justify-between cursor-pointer ${b.color} shadow-sm`}
              >
                <div>
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5 ${
                      b.color.includes('text-white') ? 'bg-white/15' : 'bg-[#1E7D3B]/10'
                    } ${b.iconColor}`}
                  >
                    {b.icon}
                  </div>
                  <h3
                    className={`font-800 text-lg mb-2 ${
                      b.color.includes('text-white') ? 'text-white' : 'text-[#10212B]'
                    }`}
                  >
                    {b.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${b.textMuted}`}>{b.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Who Can Apply ── */}
      <section className="py-24 px-6 bg-white border-b border-[#E4E8E6]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-900 text-[#0D2B45] mb-5">
              Who Can Apply?
            </h2>
            <p className="text-sm text-[#65727A] leading-relaxed mb-7">
              Sari-Fi is exclusively for sari-sari store owners. Applications are processed in person at any Sari-Fi branch — there is no online registration.
            </p>
            <div className="space-y-3.5 mb-8">
              {REQUIREMENTS.map(r => (
                <motion.div
                  key={r}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3.5"
                >
                  <div className="w-6 h-6 bg-[#1E7D3B] text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-[#10212B] font-600">{r}</span>
                </motion.div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <span className="font-700">Note:</span> Sari-Fi does not offer online registration. Visit a branch to start your application.
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden aspect-[3/4] shadow-2xl border border-[#E4E8E6] group">
              <img
                src={OWNER_IMAGE}
                alt="Store owner at counter"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-4 left-4 sm:top-5 sm:-left-5 bg-white rounded-2xl p-3.5 sm:p-4 shadow-xl border border-[#E4E8E6]"
            >
              <div className="text-xs text-[#65727A] mb-0.5">Starting limit</div>
              <div className="text-[#0D2B45] font-800 text-lg sm:text-xl">{peso(LIMIT)}</div>
              <div className="text-xs text-[#7DBE4C] font-600 mt-1">↑ Grows +{peso(LIMIT_INC)} each cycle</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Interactive Financing Calculator ── */}
      <section id="calculator" className="py-24 px-6 bg-[#0D2B45] text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="mb-14 max-w-xl"
          >
            <h2 className="text-3xl sm:text-4xl font-900 text-white">
              How the Financing Works
            </h2>
            <p className="text-white/60 mt-3 text-sm leading-relaxed">
              A simple, transparent calculation with no hidden fees. Adjust the amount and plan to see your schedule.
            </p>
          </motion.div>

          <div className="max-w-3xl space-y-6">
            {/* Controls */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-xs font-700 uppercase tracking-widest">
                      Amount to Finance
                    </span>
                    <span className="text-white font-800 text-lg tnum">
                      {peso(principal)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={Math.max(LIMIT, 10000)}
                    step={500}
                    value={principal}
                    onChange={e => setPrincipal(Number(e.target.value))}
                    className="w-full accent-[#7DBE4C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 mt-1 tnum">
                    <span>₱500</span>
                    <span>{peso(Math.max(LIMIT, 10000))}</span>
                  </div>
                </div>

                {/* Plan Toggle */}
                <div className="flex rounded-xl bg-white/10 p-1 shrink-0">
                  {([1, 2] as const).map(m => {
                    const selected = planMonths === m;
                    const wks = m === 1 ? PLAN1_WEEKS : PLAN2_WEEKS;
                    return (
                      <button
                        key={m}
                        onClick={() => setPlanMonths(m)}
                        className={`relative px-4 py-2 rounded-lg text-xs font-700 transition-all cursor-pointer ${
                          selected ? 'text-white' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {selected && (
                          <motion.div
                            layoutId="activePlanHighlight"
                            className="absolute inset-0 bg-[#1E7D3B] rounded-lg shadow-sm"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{m}-Month ({wks} wks)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Principal', value: peso(principal), sub: 'Amount borrowed' },
                { label: `Finance Charge (${CHARGE_PCT}%)`, value: peso(charge), sub: 'Applied to principal' },
                { label: 'Total Repayable', value: peso(total), sub: `${weeks} weekly payments × ${peso(perWeek)}` },
              ].map(card => (
                <motion.div
                  key={card.label}
                  whileHover={{ y: -4 }}
                  className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 text-center shadow-sm cursor-default"
                >
                  <div className="text-white/50 text-xs font-600 mb-2">{card.label}</div>
                  <div className="text-white font-800 text-2xl mb-1 tnum">{card.value}</div>
                  <div className="text-white/40 text-xs tnum">{card.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Interactive Schedule Picker */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white/50 text-xs font-700 uppercase tracking-widest">
                  Repayment Schedule · tap to mark paid
                </div>
                <button
                  onClick={() => setPaidWeeks(0)}
                  className="text-white/40 hover:text-white text-xs font-600 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className={`grid grid-cols-4 gap-2 ${weeks > 4 ? 'md:grid-cols-8' : 'md:grid-cols-4'}`}>
                {Array.from({ length: weeks }, (_, i) => {
                  const isPaid = i < paid;
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setPaidWeeks(isPaid ? i : i + 1)}
                      className={`rounded-xl p-2 text-center transition-all cursor-pointer ${
                        isPaid
                          ? 'bg-[#1E7D3B] shadow-sm'
                          : 'bg-white/8 border border-white/10 hover:bg-white/15'
                      }`}
                    >
                      <div className="text-[10px] text-white/50 mb-1">Wk {i + 1}</div>
                      <div className={`text-xs font-700 tnum ${isPaid ? 'text-white' : 'text-white/70'}`}>
                        {peso(perWeek)}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${isPaid ? 'text-white/70' : 'text-transparent'}`}>
                        Paid
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Progress track */}
              <div className="mt-3 bg-white/10 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-[#7DBE4C] h-1.5 rounded-full"
                  animate={{ width: `${(paid / weeks) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              </div>

              <div className="flex items-center justify-between text-xs mt-1.5 tnum">
                <span className="text-white/30">
                  {paid} of {weeks} installments paid
                </span>
                <span className="text-[#7DBE4C] font-600">
                  {peso(total - paid * perWeek)} remaining
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0A2138] border-t border-white/[0.06] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2 flex flex-col gap-3">
              <span className="text-xl font-900 tracking-tight text-white">Sari-Fi</span>
              <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                Financing Your Stock, Growing Your Business. Dedicated micro-enterprise inventory funding for Philippine sari-sari store owners.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="text-xs font-700 text-white/30 uppercase tracking-widest">Platform</span>
              <button
                onClick={() => navigate('login')}
                className="text-white/60 hover:text-white transition-colors text-left cursor-pointer"
              >
                Sign In to Portal
              </button>
              <button
                onClick={() => navigate('supplier/login')}
                className="text-white/60 hover:text-white transition-colors text-left cursor-pointer"
              >
                Supplier Partner Portal
              </button>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <span className="text-xs font-700 text-white/30 uppercase tracking-widest">Contact</span>
              <a href="mailto:support@sari-fi.ph" className="text-white/60 hover:text-white transition-colors">
                support@sari-fi.ph
              </a>
              <a href="tel:+639170000000" className="text-white/60 hover:text-white transition-colors">
                +63 917 000 0000
              </a>
              <span className="text-white/50 text-xs">Metro Manila, Philippines</span>
            </div>
          </div>
          <div className="border-t border-white/[0.07] pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/30">
            <span>&copy; {new Date().getFullYear()} Sari-Fi. All rights reserved.</span>
            <div className="flex items-center gap-5">
              {['Privacy Policy', 'Terms of Service', 'BSP Disclosure'].map(l => (
                <button key={l} className="hover:text-white transition-colors cursor-pointer">
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
