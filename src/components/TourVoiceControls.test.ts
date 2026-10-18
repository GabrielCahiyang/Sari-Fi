import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { TourVoiceControls } from "./TourVoiceControls"

function render(
  options: Partial<React.ComponentProps<typeof TourVoiceControls>> = {},
) {
  return renderToStaticMarkup(
    React.createElement(TourVoiceControls, {
      enabled: false,
      supported: true,
      speaking: false,
      paused: false,
      failed: false,
      onToggle: vi.fn(),
      onReplay: vi.fn(),
      ...options,
    }),
  )
}
describe("walkthrough voice controls", () => {
  it("shows a clear opt-in switch with an accessible pressed state", () => {
    const html = render()
    expect(html).toContain("Voice off")
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('aria-label="Turn voice narration on"')
  })
  it("offers replay while voice is on and disables replay when paused", () => {
    expect(render({ enabled: true })).toContain("Replay")
    const html = render({ enabled: true, paused: true })
    expect(html).toContain("Resume the guide to replay narration")
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-pressed="true"')
  })
  it("keeps a compact on/off switch when the guide is minimized", () => {
    const html = render({ enabled: true, compact: true })
    expect(html).toContain("Voice on")
    expect(html).not.toContain("Replay")
  })
  it("explains unavailable playback without blocking the visual guide", () => {
    const html = render({ supported: false })
    expect(html).toContain("Voice narration is unavailable in this browser")
    expect(html).toContain('disabled=""')
    expect(html).toContain("No voice")
  })
})
