import { useState } from 'react';
import logo from '../imports/image-1.png';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const { login, navigate, showToast } = useApp();
  const [email, setEmail] = useState('admin@sarifi.ph');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (!ok) {
      showToast('error', 'Invalid credentials. Please verify your email and password.');
    } else {
      showToast('success', 'Admin signed in successfully.');
    }
  };

  return (
    <div className="min-h-full bg-[#F7F8F6] flex flex-col items-center justify-center p-4 sm:p-6 relative">
      {/* Back to home */}
      <button
        onClick={() => navigate('home')}
        className="sm:absolute top-4 left-4 sm:top-6 sm:left-6 self-start mb-4 sm:mb-0 flex items-center gap-2 text-xs sm:text-sm text-[#65727A] hover:text-[#0D2B45] transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8">
          <img src={logo} alt="Sari-Fi" className="h-12 object-contain" />
          <div className="text-[10px] text-[#65727A] font-600 uppercase tracking-widest mt-2">Staff Portal</div>
        </div>

        <h1 className="text-2xl font-800 text-[#10212B] mb-1">Staff Sign In</h1>
        <p className="text-sm text-[#65727A] mb-7">Access the internal operations portal.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-700 text-[#65727A] uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="staff@sarifi.ph"
              className="mt-1.5 w-full px-4 py-3 bg-white border border-[#E4E8E6] rounded-xl text-sm text-[#10212B] placeholder-[#C5CBD0] focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-700 text-[#65727A] uppercase tracking-wider">Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-[#E4E8E6] rounded-xl text-sm text-[#10212B] placeholder-[#C5CBD0] focus:outline-none focus:ring-2 focus:ring-[#1E7D3B]/30 focus:border-[#1E7D3B] transition-all pr-10"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-[#65727A] hover:text-[#10212B]">
                {showPass
                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0D2B45] hover:bg-[#1a3d5c] text-white font-700 rounded-xl transition-all text-sm disabled:opacity-60 cursor-pointer shadow-md shadow-[#0D2B45]/20"
          >
            {loading ? 'Signing in…' : 'Sign In to Staff Portal'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('customer/login')} className="text-sm group cursor-pointer">
            <span className="text-[#65727A]">Are you a customer? </span>
            <span className="font-700 text-[#1E7D3B] group-hover:underline">Sign in to Customer Portal →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
