import { useState } from 'react';
import logo from '../imports/image-1.png';
import { useApp } from '../context/AppContext';

const STAFF_USERS = [
  { label: 'Admin Rosa', email: 'admin@sarifi.ph', password: 'admin123', role: 'Admin' },
  { label: 'Supervisor Ben', email: 'ben@sarifi.ph', password: 'super123', role: 'Supervisor' },
  { label: 'Employee Jay', email: 'jay@sarifi.ph', password: 'emp123', role: 'Employee' },
];

export function LoginPage() {
  const { login, navigate, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = login(email, password);
    setLoading(false);
    if (!ok) showToast('error', 'Invalid credentials. Please try again.');
  };

  const handleQuick = async (q: typeof STAFF_USERS[0]) => {
    setEmail(q.email);
    setPassword(q.password);
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    login(q.email, q.password);
    setLoading(false);
  };

  return (
    <div className="min-h-full bg-[#F7F8F6] flex flex-col items-center justify-center p-6">
      {/* Back to home */}
      <button
        onClick={() => navigate('home')}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-[#65727A] hover:text-[#0D2B45] transition-colors"
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
            className="w-full py-3 bg-[#0D2B45] hover:bg-[#1a3d5c] text-white font-700 rounded-xl transition-all text-sm disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In to Staff Portal'}
          </button>
        </form>

        {/* Quick login */}
        <div className="mt-7">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-[#E4E8E6]" />
            <span className="text-[11px] text-[#65727A] font-500">Demo Quick Login</span>
            <div className="flex-1 h-px bg-[#E4E8E6]" />
          </div>
          <div className="space-y-2">
            {STAFF_USERS.map(q => (
              <button
                key={q.email}
                onClick={() => handleQuick(q)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#E4E8E6] rounded-xl hover:border-[#0D2B45]/40 hover:bg-[#F7F8F6] transition-all group"
              >
                <div className="text-sm font-600 text-[#10212B] group-hover:text-[#0D2B45]">{q.label}</div>
                <span className="text-xs text-[#65727A] bg-[#F7F8F6] px-2 py-0.5 rounded-full border border-[#E4E8E6]">{q.role}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('customer/login')} className="text-sm group">
            <span className="text-[#65727A]">Are you a customer? </span>
            <span className="font-700 text-[#1E7D3B] group-hover:underline">Sign in to Customer Portal →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
