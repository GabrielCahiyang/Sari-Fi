import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react"
import { useApp, WalkthroughAppProvider } from "./AppContext"
import { useTourNarration } from "../hooks/useTourNarration"
import type { NarrationStatus } from "../utils/tourNarration"
import {
  createWalkthroughSession,
  describeWalkthroughStep,
  walkthroughFrame,
  TOUR_STEPS,
  type WalkthroughSession,
  type TourStep,
} from "../domain/walkthrough"
export { TOUR_STEPS } from "../domain/walkthrough"
export type { TourStep } from "../domain/walkthrough"
export type TourPhase = "focusing" | "clicking" | "success"

interface TourContextType {
  isTourActive: boolean
  currentStepIndex: number
  currentStep: TourStep
  tourPhase: TourPhase
  isPaused: boolean
  isEnding: boolean
  tourError: string | null
  stepProgress: number
  setIsPaused: (value: boolean) => void
  startTour: () => Promise<void>
  endTour: () => Promise<void>
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  voiceEnabled: boolean
  voiceSupported: boolean
  voiceStatus: NarrationStatus
  toggleVoice: () => void
  replayVoice: () => void
}
const TourContext = createContext<TourContextType | undefined>(undefined)
const STEP_DURATION = 15000
const ACTION_START = 5500

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { state, showToast } = useApp()
  const [session, setSession] = useState<WalkthroughSession | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [narrationRun, setNarrationRun] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [tourError, setTourError] = useState<string | null>(null)
  const elapsedRef = useRef(0)
  const initialFocus = useRef<HTMLElement | null>(null)
  const scrollRef = useRef(0)
  const isTourActive = session !== null
  const currentStep = useMemo(
    () =>
      session
        ? describeWalkthroughStep(session, currentStepIndex)
        : TOUR_STEPS[0],
    [session, currentStepIndex],
  )
  const {
    voiceEnabled,
    voiceSupported,
    voiceStatus,
    toggleVoice,
    replayVoice,
    stopVoice,
    voiceBusy,
  } = useTourNarration({
    active: isTourActive,
    paused: isPaused,
    stepKey: `${currentStepIndex}:${narrationRun}`,
    text: `Step ${currentStepIndex + 1} of ${TOUR_STEPS.length}. ${currentStep.title}. ${currentStep.detailedInstruction}`,
  })
  const voiceBusyRef = useRef(voiceBusy)
  voiceBusyRef.current = voiceBusy
  const tourPhase: TourPhase =
    elapsed >= ACTION_START + 900
      ? "success"
      : elapsed >= ACTION_START
        ? "clicking"
        : "focusing"

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOUR_STEPS.length) return
      stopVoice()
      setNarrationRun((run) => run + 1)
      elapsedRef.current = 0
      setElapsed(0)
      setCurrentStepIndex(index)
    },
    [stopVoice],
  )
  const nextStep = useCallback(
    () => goToStep(currentStepIndex + 1),
    [currentStepIndex, goToStep],
  )
  const prevStep = useCallback(
    () => goToStep(currentStepIndex - 1),
    [currentStepIndex, goToStep],
  )
  const startTour = useCallback(async () => {
    if (session) return
    try {
      const next = createWalkthroughSession(state)
      initialFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      scrollRef.current = window.scrollY
      elapsedRef.current = 0
      setElapsed(0)
      setCurrentStepIndex(0)
      setIsPaused(false)
      setTourError(null)
      setSession(next)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The walkthrough could not be prepared. Try again once the catalog has loaded."
      setTourError(message)
      showToast("error", message)
    }
  }, [session, state, showToast])
  const endTour = useCallback(async () => {
    stopVoice()
    setSession(null)
    setIsPaused(false)
    setTourError(null)
    setElapsed(0)
    elapsedRef.current = 0
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollRef.current, behavior: "instant" })
      if (initialFocus.current?.isConnected)
        initialFocus.current.focus({ preventScroll: true })
      else
        document
          .querySelector<HTMLElement>("[data-walkthrough-start]")
          ?.focus({ preventScroll: true })
    })
  }, [stopVoice])
  useEffect(() => {
    if (!isTourActive) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        void endTour()
      }
    }
    window.addEventListener("keydown", onKey)
    const timer = setTimeout(
      () =>
        document
          .querySelector<HTMLElement>('[aria-label="Interactive system tour"]')
          ?.focus(),
      0,
    )
    return () => {
      window.removeEventListener("keydown", onKey)
      clearTimeout(timer)
    }
  }, [isTourActive, endTour])
  useEffect(() => {
    if (!isTourActive || isPaused) return
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      if (!document.hidden)
        elapsedRef.current = Math.min(
          STEP_DURATION,
          elapsedRef.current + Math.min(now - last, 100),
        )
      last = now
      setElapsed(elapsedRef.current)
      if (elapsedRef.current >= STEP_DURATION) {
        if (voiceBusyRef.current()) {
          frame = requestAnimationFrame(tick)
          return
        }
        if (currentStepIndex < TOUR_STEPS.length - 1) nextStep()
        else setIsPaused(true)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isTourActive, isPaused, currentStepIndex, nextStep])

  const actionDone = elapsed >= ACTION_START
  const preview = useMemo(
    () =>
      session ? walkthroughFrame(session, currentStepIndex, actionDone) : null,
    [session, currentStepIndex, actionDone],
  )
  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStepIndex,
        currentStep,
        tourPhase,
        isPaused,
        isEnding: false,
        tourError,
        stepProgress: (elapsed / STEP_DURATION) * 100,
        setIsPaused,
        startTour,
        endTour,
        nextStep,
        prevStep,
        goToStep,
        voiceEnabled,
        voiceSupported,
        voiceStatus,
        toggleVoice,
        replayVoice,
      }}
    >
      {preview ? (
        <WalkthroughAppProvider state={preview}>
          {children}
        </WalkthroughAppProvider>
      ) : (
        children
      )}
    </TourContext.Provider>
  )
}
export function useTour() {
  const value = useContext(TourContext)
  if (!value) throw new Error("useTour must be used within a TourProvider")
  return value
}
