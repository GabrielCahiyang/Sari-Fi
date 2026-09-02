import { useApp } from '../../context/AppContext';

export function Toast() {
  const { state, dispatch } = useApp();
  const toast = state.toast;

  if (!toast) return null;

  const styles = {
    success: 'bg-[#1E7D3B] text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-[#0D2B45] text-white',
  };

  const icons = {
    success: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div className={`flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-soft-xl ring-1 ring-white/10 text-sm font-500 ${styles[toast.type]}`}>
        <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          {icons[toast.type]}
        </span>
        <span className="pr-1">{toast.message}</span>
        <button onClick={() => dispatch({ type: 'SET_TOAST', toast: null })} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
