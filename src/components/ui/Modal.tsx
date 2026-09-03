import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !mounted) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-[#0D2B45]/50 backdrop-blur-xs" />
      <div
        className={`relative w-full ${widths[size]} max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 my-auto z-10 overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E4E8E6] shrink-0">
          <h2 className="text-sm sm:text-base font-700 text-[#10212B] tracking-tight truncate pr-2">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#65727A] hover:text-[#10212B] transition-colors p-2 rounded-xl hover:bg-[#F7F8F6] cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>,
    document.body
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-[#65727A] mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm font-600 text-[#65727A] bg-[#F7F8F6] rounded-xl hover:bg-[#E4E8E6] transition-colors cursor-pointer">Cancel</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 text-sm font-600 text-white rounded-xl transition-colors cursor-pointer ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1E7D3B] hover:bg-[#22913f]'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
