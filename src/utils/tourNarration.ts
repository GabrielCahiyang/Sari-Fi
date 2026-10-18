export type NarrationStatus = "idle" | "speaking" | "error"
export interface NarrationRuntime {
  synthesis: Pick<SpeechSynthesis, "speak" | "cancel" | "getVoices">
  utterance: (text: string) => SpeechSynthesisUtterance
}

export function browserNarrationRuntime(): NarrationRuntime | undefined {
  if (typeof window === "undefined") return
  try {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return
    return {
      synthesis: window.speechSynthesis,
      utterance: (text) => new window.SpeechSynthesisUtterance(text),
    }
  } catch {
    return
  }
}

/** Keep currency/quantity explanations understandable when spoken aloud. */
export function spokenTourText(text: string): string {
  return text
    .replace(
      /₱([\d,]+)(?:\.(\d{1,2}))?/g,
      (_, whole: string, decimal?: string) => {
        const pesos = Number(whole.replace(/,/g, ""))
        const centavos = Number((decimal || "").padEnd(2, "0"))
        return `${pesos} ${pesos === 1 ? "peso" : "pesos"}${
          centavos
            ? ` and ${centavos} ${centavos === 1 ? "centavo" : "centavos"}`
            : ""
        }`
      },
    )
    .replace(/(\d+)\+/g, "$1 or more")
    .replace(/%/g, " percent")
    .replace(/→/g, " to ")
    .replace(/\bGCash\b/g, "G Cash")
    .replace(/\bSKU\b/g, "S K U")
    .replace(/month\(s\)/g, "months")
}

/** One owned utterance at a time. Old cancellation events cannot affect a new step. */
export class TourNarrator {
  private generation = 0
  private active = false
  private status: NarrationStatus = "idle"
  private watchdog: ReturnType<typeof setTimeout> | undefined
  constructor(
    private runtime: NarrationRuntime,
    private notify: (status: NarrationStatus) => void,
  ) {}

  get busy() {
    return this.active
  }

  read(text: string): void {
    this.stop()
    const generation = ++this.generation
    const spoken = spokenTourText(text)
    // Short utterances also work with voices that cut off long paragraphs.
    const chunks: string[] = []
    let chunk = ""
    for (const word of spoken.split(/\s+/)) {
      if (chunk && chunk.length + 1 + word.length > 180) {
        chunks.push(chunk)
        chunk = ""
      }
      chunk += `${chunk ? " " : ""}${word}`
    }
    if (chunk) chunks.push(chunk)
    const finish = (status: NarrationStatus) => {
      if (generation !== this.generation) return
      clearTimeout(this.watchdog)
      this.active = false
      this.status = status
      this.notify(status)
    }
    const speakChunk = (index: number) => {
      if (generation !== this.generation) return
      if (index >= chunks.length) {
        finish("idle")
        return
      }
      try {
        const utterance = this.runtime.utterance(chunks[index])
        const voices = this.runtime.synthesis.getVoices()
        const voice =
          voices.find((v) => v.lang.toLowerCase() === "en-ph") ||
          voices.find((v) => v.lang.toLowerCase() === "en-us") ||
          voices.find((v) => /^en\b/i.test(v.lang))
        if (voice) utterance.voice = voice
        utterance.lang = voice?.lang || "en-US"
        utterance.rate = 1
        utterance.pitch = 1
        utterance.volume = 1
        utterance.onend = () => speakChunk(index + 1)
        utterance.onerror = () => finish("error")
        this.runtime.synthesis.speak(utterance)
      } catch {
        finish("error")
      }
    }
    if (!chunks.length) return
    // Mark queued speech as busy, so autoplay waits even before audio starts.
    this.active = true
    this.status = "speaking"
    this.notify("speaking")
    // A silent/failed speech engine must not hold the walkthrough forever.
    this.watchdog = setTimeout(
      () => {
        if (generation !== this.generation) return
        ++this.generation
        try {
          this.runtime.synthesis.cancel()
        } catch {
          /* Release the guide anyway. */
        }
        this.active = false
        this.status = "error"
        this.notify("error")
      },
      Math.min(
        120000,
        Math.max(15000, spoken.split(/\s+/).length * 600 + 15000),
      ),
    )
    speakChunk(0)
  }

  stop(): void {
    ++this.generation
    clearTimeout(this.watchdog)
    if (this.active) {
      try {
        this.runtime.synthesis.cancel()
      } catch {
        /* Still release the guide clock. */
      }
    }
    this.active = false
    if (this.status === "speaking") {
      this.status = "idle"
      this.notify("idle")
    }
  }
}
