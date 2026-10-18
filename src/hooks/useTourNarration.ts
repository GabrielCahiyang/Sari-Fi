import { useCallback, useEffect, useRef, useState } from "react"
import {
  browserNarrationRuntime,
  TourNarrator,
  type NarrationStatus,
} from "../utils/tourNarration"

export function useTourNarration({
  active,
  paused,
  stepKey,
  text,
}: {
  active: boolean
  paused: boolean
  stepKey: string
  text: string
}) {
  const [runtime] = useState(browserNarrationRuntime)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<NarrationStatus>("idle")
  const spokenStep = useRef<string | null>(null)
  const [narrator] = useState(() =>
    runtime
      ? new TourNarrator(runtime, (status) => {
          setVoiceStatus(status)
          if (status === "error") setVoiceEnabled(false)
        })
      : null,
  )

  const stopVoice = useCallback(() => {
    spokenStep.current = null
    narrator?.stop()
  }, [narrator])

  const play = useCallback(() => {
    if (!narrator || !active || paused || spokenStep.current === stepKey) return
    spokenStep.current = stepKey
    narrator.read(text)
  }, [narrator, active, paused, stepKey, text])

  const toggleVoice = useCallback(() => {
    if (!narrator) return
    if (voiceEnabled) {
      setVoiceEnabled(false)
      stopVoice()
    } else {
      setVoiceEnabled(true)
      // Start synchronously from the click to satisfy browser audio activation.
      play()
    }
  }, [narrator, voiceEnabled, stopVoice, play])

  const replayVoice = useCallback(() => {
    if (!voiceEnabled) return
    stopVoice()
    play()
  }, [voiceEnabled, stopVoice, play])

  useEffect(() => {
    if (!active || !voiceEnabled || paused) {
      stopVoice()
      if (!active) {
        setVoiceEnabled(false)
        setVoiceStatus("idle")
      }
      return
    }
    play()
  }, [active, voiceEnabled, paused, play, stopVoice])
  useEffect(() => () => narrator?.stop(), [narrator])

  return {
    voiceEnabled,
    voiceSupported: !!narrator,
    voiceStatus,
    toggleVoice,
    replayVoice,
    stopVoice,
    voiceBusy: () => narrator?.busy ?? false,
  }
}
