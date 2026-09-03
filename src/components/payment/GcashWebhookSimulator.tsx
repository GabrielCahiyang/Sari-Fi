import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface GcashReference {
  label: string;
  referenceId?: string;
}

interface GcashWebhookSimulatorProps {
  amount: string;
  references: GcashReference[];
  merchantLabel?: string;
  onConfirm: () => Promise<void>;
  onFinished: () => void;
}

const STEPS = [
  {
    title: 'Creating payment request',
    detail: 'Preparing a signed merchant request',
    event: 'POST /payments/pay',
  },
  {
    title: 'Wallet authorization received',
    detail: 'Customer payment was authorized',
    event: 'paymentStatus: PROCESSING',
  },
  {
    title: 'Webhook callback received',
    detail: 'GCash sent the payment result notification',
    event: 'POST /payments/notifyPayment',
  },
  {
    title: 'Validating callback signature',
    detail: 'Matching amount, reference, and signature',
    event: 'resultStatus: S',
  },
] as const;

const STEP_DURATION_SECONDS = 1.15;

/** A clearly labelled visual simulation of the asynchronous GCash merchant flow. */
export function GcashWebhookSimulator({
  amount,
  references,
  merchantLabel = 'Sari-Fi Merchant',
  onConfirm,
  onFinished,
}: GcashWebhookSimulatorProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<'running' | 'settling' | 'success' | 'error'>('running');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const confirmRef = useRef(onConfirm);
  const finishedRef = useRef(onFinished);

  useEffect(() => { confirmRef.current = onConfirm; }, [onConfirm]);
  useEffect(() => { finishedRef.current = onFinished; }, [onFinished]);

  useEffect(() => {
    let cancelled = false;
    const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

    const run = async () => {
      setStatus('running');
      setErrorMessage('');
      setStepIndex(0);
      try {
        for (let index = 0; index < STEPS.length; index += 1) {
          if (cancelled) return;
          setStepIndex(index);
          await wait(STEP_DURATION_SECONDS * 1000);
        }
        if (cancelled) return;
        setStatus('settling');
        await confirmRef.current();
        if (cancelled) return;
        setStatus('success');
        await wait(1250);
        if (!cancelled) finishedRef.current();
      } catch (error: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(error?.message || 'The simulated callback could not be completed.');
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [attempt]);

  const activeStep = STEPS[stepIndex];
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div className="overflow-hidden rounded-3xl border border-[#DDE5F2] bg-white text-left shadow-[0_24px_70px_-35px_rgba(0,70,180,0.5)]">
      <div className="relative overflow-hidden bg-[#0878E8] px-5 pb-5 pt-4 text-white">
        <motion.div
          className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10"
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-900 text-[#0878E8] shadow-sm">G</div>
            <div>
              <div className="text-sm font-800 leading-tight">GCash Payment</div>
              <div className="text-[10px] font-600 text-white/70">Secure merchant checkout</div>
            </div>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[9px] font-800 uppercase tracking-[0.16em] text-white/85">
            Demo gateway
          </span>
        </div>

        <div className="relative mt-5">
          <div className="text-[10px] font-700 uppercase tracking-[0.14em] text-white/65">Amount to pay</div>
          <div className="mt-0.5 text-3xl font-900 tracking-tight">{amount}</div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-600 text-white/75">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v3" />
            </svg>
            {merchantLabel} · encrypted session
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-5 flex gap-1.5" aria-label="Payment verification progress">
          {STEPS.map((step, index) => (
            <div key={step.event} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E8EEF6]">
              {index < stepIndex || isSuccess ? (
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className={`h-full origin-left ${isSuccess ? 'bg-[#20B26B]' : 'bg-[#0878E8]'}`} />
              ) : index === stepIndex && !isError ? (
                <motion.div
                  key={`${attempt}-${index}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: STEP_DURATION_SECONDS, ease: 'linear' }}
                  className="h-full origin-left bg-[#0878E8]"
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex min-h-16 items-center gap-3" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={status === 'running' ? stepIndex : status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex w-full items-center gap-3"
            >
              <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isSuccess ? 'bg-emerald-50 text-[#20A764]' : isError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#0878E8]'}`}>
                {isSuccess ? (
                  <motion.svg initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 20 }} className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : isError ? (
                  <span className="text-lg font-900">!</span>
                ) : (
                  <>
                    <motion.span className="absolute inset-1 rounded-xl border border-[#0878E8]/25" animate={{ scale: [0.85, 1.12], opacity: [0.8, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }} />
                    <motion.span className="h-2.5 w-2.5 rounded-full bg-[#0878E8]" animate={{ scale: [0.8, 1.15, 0.8] }} transition={{ duration: 1.1, repeat: Infinity }} />
                  </>
                )}
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-800 ${isSuccess ? 'text-[#158451]' : isError ? 'text-red-600' : 'text-[#10212B]'}`}>
                  {isSuccess ? 'Payment confirmed' : isError ? 'Verification interrupted' : status === 'settling' ? 'Applying payment securely' : activeStep.title}
                </div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#65727A]">
                  {isSuccess ? 'The signed callback was accepted and the transaction is settled.' : isError ? errorMessage : status === 'settling' ? 'Updating the order and payment ledger.' : activeStep.detail}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 rounded-2xl border border-[#E4E8E6] bg-[#F8FAFC] p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[9px] font-800 uppercase tracking-[0.14em] text-[#65727A]">
            <span>Webhook activity</span>
            <span className="flex items-center gap-1.5 text-[#20A764]"><span className="h-1.5 w-1.5 rounded-full bg-[#20B26B]" /> Live</span>
          </div>
          <div className="space-y-1.5 font-mono text-[9px] sm:text-[10px]">
            {STEPS.slice(0, stepIndex + 1).map((step, index) => (
              <motion.div key={step.event} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between gap-3">
                <span className="truncate text-[#52616B]">{step.event}</span>
                <span className={`font-800 ${index < stepIndex || isSuccess ? 'text-[#20A764]' : 'text-[#0878E8]'}`}>
                  {index < stepIndex || isSuccess ? 'OK' : 'WAIT'}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {references.slice(0, 3).map(reference => (
            <div key={`${reference.label}-${reference.referenceId}`} className="flex items-center justify-between gap-3 text-[10px]">
              <span className="text-[#65727A]">{reference.label}</span>
              <span className="max-w-[65%] truncate font-mono font-700 text-[#10212B]">{reference.referenceId || 'Generating…'}</span>
            </div>
          ))}
          {references.length > 3 && <div className="text-right text-[9px] text-[#65727A]">+{references.length - 3} more supplier references</div>}
        </div>

        {isError && (
          <button
            type="button"
            onClick={() => setAttempt(value => value + 1)}
            className="mt-4 w-full rounded-xl bg-[#0878E8] py-2.5 text-xs font-800 text-white transition-colors hover:bg-[#0668C8]"
          >
            Retry verification
          </button>
        )}

        <div className="mt-4 text-center text-[9px] leading-relaxed text-[#8A969D]">
          Visual sandbox only · no real wallet is charged
        </div>
      </div>
    </div>
  );
}
