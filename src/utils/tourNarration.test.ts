import { afterEach, describe, expect, it, vi } from "vitest"
import {
  TourNarrator,
  spokenTourText,
  browserNarrationRuntime,
  type NarrationRuntime,
} from "./tourNarration"

function harness(voices: SpeechSynthesisVoice[] = []) {
  const spoken: SpeechSynthesisUtterance[] = []
  const notify = vi.fn()
  const runtime: NarrationRuntime = {
    synthesis: {
      getVoices: () => voices,
      speak: vi.fn((utterance) => {
        spoken.push(utterance)
      }),
      cancel: vi.fn(),
    },
    utterance: (text) => ({ text }) as SpeechSynthesisUtterance,
  }
  return {
    runtime,
    spoken,
    notify,
    narrator: new TourNarrator(runtime, notify),
  }
}
const finish = (utterance: SpeechSynthesisUtterance) =>
  utterance.onend?.({} as SpeechSynthesisEvent)
afterEach(() => vi.useRealTimers())

describe("walkthrough voice narration", () => {
  it("reads prices, percentages, quantity thresholds and GCash clearly", () => {
    expect(
      spokenTourText("₱1,454.40 → ₱1.00 at 12+ units, 3% via GCash, same SKU."),
    ).toBe(
      "1454 pesos and 40 centavos  to  1 peso at 12 or more units, 3 percent via G Cash, same S K U.",
    )
  })
  it("uses an English Philippine voice and keeps queued audio busy until it finishes", () => {
    const local = { lang: "en-PH" } as SpeechSynthesisVoice
    const h = harness([{ lang: "en-US" } as SpeechSynthesisVoice, local])
    h.narrator.read("Welcome to the guide.")
    expect(h.spoken[0].voice).toBe(local)
    expect(h.narrator.busy).toBe(true)
    finish(h.spoken[0])
    expect(h.narrator.busy).toBe(false)
    expect(h.notify).toHaveBeenLastCalledWith("idle")
  })
  it("waits for every part of a long step rather than finishing at the first sentence", () => {
    const h = harness()
    h.narrator.read(
      "Review the current product prices and financing terms carefully. ".repeat(
        12,
      ),
    )
    let index = 0
    while (index < h.spoken.length) {
      expect(h.narrator.busy).toBe(true)
      expect(h.spoken[index].text.length).toBeLessThanOrEqual(180)
      finish(h.spoken[index++])
    }
    expect(index).toBeGreaterThan(1)
    expect(h.narrator.busy).toBe(false)
  })
  it("cancels old speech on navigation and ignores stale cancellation events", () => {
    const h = harness()
    h.narrator.read("First step.")
    const old = h.spoken[0]
    h.runtime.synthesis.cancel = vi.fn(() =>
      old.onerror?.({ error: "canceled" } as SpeechSynthesisErrorEvent),
    )
    h.narrator.read("Second step.")
    finish(old)
    expect(h.runtime.synthesis.cancel).toHaveBeenCalledOnce()
    expect(h.narrator.busy).toBe(true)
    expect(h.notify).not.toHaveBeenCalledWith("error")
    expect(h.spoken.at(-1)?.text).toBe("Second step.")
    h.narrator.stop()
  })
  it("stops immediately on pause, mute or exit without queueing the remaining chunks", () => {
    const h = harness()
    h.narrator.read("Long explanation. ".repeat(50))
    const active = h.spoken[0]
    h.narrator.stop()
    finish(active)
    expect(h.spoken).toHaveLength(1)
    expect(h.narrator.busy).toBe(false)
    expect(h.runtime.synthesis.cancel).toHaveBeenCalledOnce()
  })
  it("reports playback errors and can retry without holding the guide", () => {
    const h = harness()
    h.runtime.synthesis.speak = vi.fn(() => {
      throw new Error("Audio blocked")
    })
    h.narrator.read("First attempt.")
    expect(h.narrator.busy).toBe(false)
    expect(h.notify).toHaveBeenLastCalledWith("error")
    h.runtime.synthesis.speak = vi.fn((u) => h.spoken.push(u))
    h.narrator.read("Retry.")
    expect(h.narrator.busy).toBe(true)
    finish(h.spoken[0])
  })
  it("releases autoplay when a speech engine never sends completion events", () => {
    vi.useFakeTimers()
    const h = harness()
    h.narrator.read("Short example.")
    vi.advanceTimersByTime(20000)
    expect(h.narrator.busy).toBe(false)
    expect(h.notify).toHaveBeenLastCalledWith("error")
    expect(h.runtime.synthesis.cancel).toHaveBeenCalledOnce()
  })
  it("handles unsupported/non-browser environments", () => {
    expect(browserNarrationRuntime()).toBeUndefined()
  })
})
