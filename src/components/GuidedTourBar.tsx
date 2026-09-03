import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { TOUR_STEPS, useTour } from '../context/TourContext';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const spring = { type: 'spring' as const, stiffness: 210, damping: 28, mass: 0.9 };

function PauseIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M6.4 4.5a1 1 0 0 1 1.55-.83l7.1 4.5a1 1 0 0 1 0 1.66l-7.1 4.5a1 1 0 0 1-1.55-.83v-9Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="3.5" height="12" rx="1" />
      <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
    </svg>
  );
}

function Spinner() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </motion.svg>
  );
}

export function GuidedTourBar() {
  const {
    isTourActive,
    currentStepIndex,
    currentStep,
    tourPhase,
    isPaused,
    isEnding,
    tourError,
    stepProgress,
    setIsPaused,
    nextStep,
    prevStep,
    goToStep,
    endTour,
  } = useTour();

  const reduceMotion = useReducedMotion();
  const [isMinimized, setIsMinimized] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!isTourActive || isMinimized) return;

    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let observedTarget: Element | null = null;

    const findVisibleTarget = () => {
      const candidates = Array.from(
        document.querySelectorAll(`[data-tour-target="${currentStep.id}"]`)
      );

      return candidates.find(candidate => {
        const rect = candidate.getBoundingClientRect();
        const style = window.getComputedStyle(candidate);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }) ?? document.querySelector('main');
    };

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = findVisibleTarget();
        if (!target) return;

        if (target !== observedTarget) {
          resizeObserver?.disconnect();
          resizeObserver = new ResizeObserver(measure);
          resizeObserver.observe(target);
          observedTarget = target;
        }

        const rect = target.getBoundingClientRect();
        const padding = window.innerWidth < 640 ? 6 : 10;
        const left = Math.max(8, rect.left - padding);
        const top = Math.max(8, rect.top - padding);
        const right = Math.min(window.innerWidth - 8, rect.right + padding);
        const bottom = Math.min(window.innerHeight - 8, rect.bottom + padding);

        setSpotlight({
          left,
          top,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        });
      });
    };

    const settleTimer = window.setTimeout(() => {
      const target = findVisibleTarget();
      if (target) {
        const rect = target.getBoundingClientRect();
        const reservedBottom = window.innerWidth < 640 ? 330 : 255;
        if (rect.top < 20 || rect.bottom > window.innerHeight - reservedBottom) {
          target.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
      }
      measure();
    }, 180);

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    measure();

    return () => {
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [currentStep.id, isMinimized, isTourActive, reduceMotion]);

  const phaseCopy = useMemo(() => {
    if (isEnding) return { label: 'Restoring your workspace', tone: 'text-sky-200', dot: 'bg-sky-300' };
    if (tourError) return { label: tourError, tone: 'text-rose-200', dot: 'bg-rose-300' };
    if (isPaused) return { label: 'Tour paused', tone: 'text-amber-200', dot: 'bg-amber-300' };
    if (tourPhase === 'clicking') return { label: 'Applying the demo action', tone: 'text-amber-100', dot: 'bg-amber-300' };
    if (tourPhase === 'success') return { label: 'Saved — review the live result', tone: 'text-emerald-200', dot: 'bg-emerald-300' };
    return { label: 'Spotlighting the live workspace', tone: 'text-white/70', dot: 'bg-white/60' };
  }, [isEnding, isPaused, tourError, tourPhase]);

  if (!isTourActive) return null;

  const labelTop = spotlight && spotlight.top > 48 ? spotlight.top - 36 : (spotlight?.top ?? 16) + 12;
  const labelLeft = spotlight
    ? Math.min(Math.max(12, spotlight.left), Math.max(12, window.innerWidth - 330))
    : 12;
  const targetCenter = spotlight
    ? { x: spotlight.left + spotlight.width * 0.72, y: spotlight.top + spotlight.height * 0.58 }
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {!isMinimized && spotlight && (
          <motion.div
            key="spotlight-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.45 }}
            className="absolute inset-0"
          >
            <motion.div
              animate={{ height: spotlight.top }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="pointer-events-auto absolute inset-x-0 top-0 bg-[#061521]/64 backdrop-blur-[2px]"
            />
            <motion.div
              animate={{ top: spotlight.top + spotlight.height }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="pointer-events-auto absolute inset-x-0 bottom-0 bg-[#061521]/64 backdrop-blur-[2px]"
            />
            <motion.div
              animate={{ top: spotlight.top, width: spotlight.left, height: spotlight.height }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="pointer-events-auto absolute left-0 bg-[#061521]/64 backdrop-blur-[2px]"
            />
            <motion.div
              animate={{ top: spotlight.top, left: spotlight.left + spotlight.width, height: spotlight.height }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="pointer-events-auto absolute right-0 bg-[#061521]/64 backdrop-blur-[2px]"
            />

            <motion.div
              layout
              animate={{
                x: spotlight.left,
                y: spotlight.top,
                width: spotlight.width,
                height: spotlight.height,
              }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="absolute left-0 top-0 rounded-[22px] border-2 border-emerald-400/90 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_0_0_7px_rgba(52,211,153,0.13),0_20px_80px_rgba(16,185,129,0.32)]"
            >
              <motion.div
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-px rounded-[22px] ring-1 ring-emerald-200/70"
              />
            </motion.div>

            <motion.div
              animate={{ x: labelLeft, y: labelTop }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="absolute left-0 top-0 flex max-w-[318px] items-center gap-2 rounded-full border border-white/15 bg-[#0B263D]/95 px-3 py-1.5 text-[10px] font-700 tracking-wide text-white shadow-xl backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <motion.span
                  animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-emerald-300"
                />
                <span className="relative h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              <span className="truncate">{currentStep.targetFocusName}</span>
            </motion.div>

            <AnimatePresence>
              {tourPhase === 'clicking' && !isPaused && !isEnding && (
                <motion.div
                  key={`action-${currentStep.id}`}
                  initial={{ x: targetCenter.x + 80, y: targetCenter.y + 70, opacity: 0, scale: 0.7 }}
                  animate={{ x: targetCenter.x, y: targetCenter.y, opacity: 1, scale: [0.9, 1, 0.86, 1] }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: reduceMotion ? 0.01 : 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="absolute -inset-7 rounded-full bg-emerald-300/20 blur-md" />
                  <motion.span
                    animate={{ scale: [0.45, 1.45], opacity: [0.9, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute -inset-4 rounded-full border-2 border-emerald-300"
                  />
                  <svg viewBox="0 0 32 36" className="relative h-9 w-8 drop-shadow-xl" aria-hidden="true">
                    <path d="M4 2 27 21l-10 .8-5.2 10.8L4 2Z" fill="white" stroke="#0D2B45" strokeWidth="2.3" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5 flex justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isMinimized ? (
            <motion.div
              key="tour-minimized"
              layoutId="tour-panel"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 overflow-hidden rounded-2xl border border-white/12 bg-[#0B263D]/96 p-2.5 pl-3.5 text-white shadow-[0_24px_70px_rgba(4,20,32,0.38)] backdrop-blur-2xl"
            >
              <div className="relative h-9 w-9 shrink-0 rounded-xl bg-emerald-400/12 text-emerald-200 flex items-center justify-center text-base">
                {currentStep.roleIcon}
                <svg className="absolute -inset-0.5 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
                  <motion.circle
                    cx="20" cy="20" r="18" fill="none" stroke="#6EE7B7" strokeWidth="2"
                    strokeLinecap="round" pathLength="100" strokeDasharray="100"
                    animate={{ strokeDashoffset: 100 - stepProgress }}
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-700 uppercase tracking-[0.16em] text-white/45">
                  Step {currentStep.stageNumber} of {String(TOUR_STEPS.length).padStart(2, '0')}
                </div>
                <div className="truncate text-xs font-700 text-white">{currentStep.title}</div>
              </div>
              <button
                onClick={() => setIsPaused(!isPaused)}
                disabled={isEnding}
                className="rounded-xl p-2 text-white/65 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                aria-label={isPaused ? 'Resume tour' : 'Pause tour'}
              >
                <PauseIcon paused={isPaused} />
              </button>
              <button
                onClick={() => setIsMinimized(false)}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-700 text-white transition-colors hover:bg-white/15"
              >
                Open guide
              </button>
              <button
                onClick={() => void endTour()}
                disabled={isEnding}
                className="rounded-xl p-2 text-white/45 transition-colors hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-40"
                aria-label="Exit tour and reset demo data"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          ) : (
            <motion.section
              key="tour-expanded"
              layoutId="tour-panel"
              initial={{ opacity: 0, y: 28, scale: 0.975 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.985 }}
              transition={reduceMotion ? { duration: 0.01 } : spring}
              className="pointer-events-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/12 bg-[#0B263D]/97 text-white shadow-[0_28px_90px_rgba(4,20,32,0.46)] backdrop-blur-2xl"
              aria-label="Interactive system tour"
            >
              <div className="h-1 bg-white/[0.08]">
                <motion.div
                  className="h-full origin-left bg-linear-to-r from-amber-300 via-emerald-300 to-emerald-500"
                  animate={{ scaleX: stepProgress / 100 }}
                  transition={{ duration: 0.08, ease: 'linear' }}
                />
              </div>

              <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-2.5 sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="rounded-md bg-emerald-400/12 px-2 py-1 text-[9px] font-800 uppercase tracking-[0.18em] text-emerald-200">
                    Live tour
                  </span>
                  <span className="text-[10px] font-600 text-white/40">
                    Step {currentStep.stageNumber} / {String(TOUR_STEPS.length).padStart(2, '0')}
                  </span>
                  <span className="hidden truncate text-[10px] text-white/30 sm:block">/{currentStep.targetPage}</span>
                </div>

                <button
                  onClick={() => setIsPaused(!isPaused)}
                  disabled={isEnding}
                  aria-label={isPaused ? 'Resume tour' : 'Pause tour'}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-700 text-white/65 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <PauseIcon paused={isPaused} />
                  <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-700 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Minimize
                </button>
                <button
                  onClick={() => void endTour()}
                  disabled={isEnding}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-700 text-rose-200/75 transition-colors hover:bg-rose-400/10 hover:text-rose-100 disabled:opacity-40"
                >
                  {isEnding ? <Spinner /> : null}
                  <span>{isEnding ? 'Resetting' : 'Exit & reset'}</span>
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, x: 20, filter: 'blur(5px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg px-2 py-1 text-[9px] font-800 uppercase tracking-wide ${currentStep.roleBadgeColor}`}>
                        {currentStep.roleIcon} {currentStep.roleName}
                      </span>
                      <span className="text-[10px] text-white/35">
                        acting as {currentStep.targetUser.email}
                      </span>
                    </div>
                    <h2 className="text-sm font-800 tracking-tight text-white sm:text-[15px]">
                      {currentStep.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-[11px] leading-[1.65] text-white/62 sm:text-xs">
                      {currentStep.detailedInstruction}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-3 sm:min-w-44 sm:flex-col sm:items-end">
                    <div className={`flex items-center gap-2 text-[10px] font-700 ${phaseCopy.tone}`}>
                      {isEnding ? <Spinner /> : <motion.span layout className={`h-1.5 w-1.5 rounded-full ${phaseCopy.dot}`} />}
                      <span>{phaseCopy.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <motion.button
                        whileHover={{ x: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={prevStep}
                        disabled={currentStepIndex === 0 || tourPhase === 'clicking' || isEnding}
                        className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-700 text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                      >
                        Back
                      </motion.button>
                      {currentStepIndex < TOUR_STEPS.length - 1 ? (
                        <motion.button
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={nextStep}
                          disabled={tourPhase !== 'success' || isEnding}
                          className="rounded-xl bg-emerald-500 px-3.5 py-2 text-[10px] font-800 text-white shadow-[0_8px_24px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
                        >
                          {tourPhase === 'success' ? 'Next step' : 'Auto-playing'}
                        </motion.button>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => void endTour()}
                          disabled={tourPhase !== 'success' || isEnding}
                          className="rounded-xl bg-amber-300 px-3.5 py-2 text-[10px] font-800 text-[#0B263D] transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
                        >
                          Finish & reset
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center gap-1.5 border-t border-white/[0.08] px-4 py-2.5 sm:px-5">
                {TOUR_STEPS.map((step, index) => {
                  const active = index === currentStepIndex;
                  const completed = index < currentStepIndex;
                  const reachable = index <= currentStepIndex;
                  return (
                    <button
                      key={step.id}
                      onClick={() => reachable && goToStep(index)}
                      disabled={!reachable || tourPhase === 'clicking' || isEnding}
                      className="group relative h-5 flex-1 disabled:cursor-default"
                      aria-label={`Tour step ${index + 1}: ${step.title}`}
                      aria-current={active ? 'step' : undefined}
                    >
                      <span className={`absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full transition-colors ${
                        active ? 'bg-amber-300' : completed ? 'bg-emerald-400/80' : 'bg-white/10 group-hover:bg-white/20'
                      }`} />
                      {active && (
                        <motion.span
                          layoutId="tour-active-step"
                          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0B263D] bg-amber-200 shadow-[0_0_0_2px_rgba(253,230,138,0.28)]"
                          transition={spring}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
