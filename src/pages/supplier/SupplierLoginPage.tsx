import { useState } from 'react';
import { motion } from 'motion/react';
import logo from '../../assets/sarifi-logo.png';
import { useApp } from '../../context/AppContext';
import { isValidEmail } from '../../utils/validation';

export function SupplierLoginPage() {
  const { login, navigate, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      const message = 'Enter both your supplier email and password.';
      setError(message);
      showToast('error', message);
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      const message = 'Enter a valid supplier email address.';
      setError(message);
      showToast('error', message);
      return;
    }
    setLoading(true);

    const ok = await login(cleanEmail, password);
    setLoading(false);

    if (!ok) {
      setError('Invalid supplier credentials. Please verify your email and password.');
      showToast('error', 'Login failed. Please check your credentials.');
    } else {
      showToast('success', 'Supplier signed in successfully.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#7DBE4C]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home button */}
      <motion.button
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate('home')}
        className="sm:absolute top-6 left-6 self-start mb-4 sm:mb-0 flex items-center gap-2 text-xs sm:text-sm font-700 text-[#65727A] hover:text-[#0D2B45] transition-colors cursor-pointer z-10"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Sari-Fi Home
      </motion.button>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="w-full max-w-md bg-white rounded-3xl border border-[#E4E8E6] shadow-xl shadow-[#0D2B45]/5 p-6 sm:p-8 relative z-10 overflow-hidden"
      >
        {/* Accent line at top of card */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0D2B45] via-[#7DBE4C] to-[#0D2B45]" />

        {/* Brand Header */}
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#0D2B45] mb-3 shadow-xs">
            <img src={logo} alt="Sari-Fi" className="h-10 object-contain" />
          </div>

          <div className="flex justify-center mb-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-700 uppercase tracking-widest bg-amber-50 text-[#B8860B] border border-amber-200">
              Wholesale Supplier Portal
            </span>
          </div>

          <h1 className="text-2xl font-800 text-[#10212B] tracking-tight">
            Supplier Partner Sign In
          </h1>
          <p className="text-xs sm:text-sm text-[#65727A] mt-1.5 max-w-xs mx-auto">
            Manage your wholesale inventory catalog and fulfill sari-sari store restock orders.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-600 flex items-center gap-2.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-700 text-[#0D2B45] mb-1.5 uppercase tracking-wider">
              Supplier Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. supplier@partner.ph"
              className="w-full px-4 py-3 bg-[#F7F8F6] border border-[#E4E8E6] rounded-xl text-sm text-[#10212B] placeholder-[#C5CBD0] focus:outline-none focus:ring-2 focus:ring-[#7DBE4C]/40 focus:border-[#7DBE4C] transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-700 text-[#0D2B45] uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#F7F8F6] border border-[#E4E8E6] rounded-xl text-sm text-[#10212B] placeholder-[#C5CBD0] focus:outline-none focus:ring-2 focus:ring-[#7DBE4C]/40 focus:border-[#7DBE4C] transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-3.5 text-[#65727A] hover:text-[#0D2B45] cursor-pointer p-0.5"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0D2B45] hover:bg-[#153e61] text-white font-700 rounded-xl transition-all text-sm disabled:opacity-60 cursor-pointer shadow-md shadow-[#0D2B45]/20 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In to Supplier Portal'}
          </motion.button>
        </form>

        {/* Link to Staff Portal */}
        <div className="mt-6 pt-5 border-t border-[#E4E8E6] text-center">
          <button
            type="button"
            onClick={() => navigate('login')}
            className="text-xs text-[#65727A] hover:text-[#0D2B45] transition-colors cursor-pointer group"
          >
            <span>Sari-Fi internal staff? </span>
            <span className="font-700 text-[#0D2B45] group-hover:underline">
              Sign in to Staff Portal →
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
