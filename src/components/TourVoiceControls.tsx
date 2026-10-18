function VoiceIcon({ enabled }: { enabled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m11 5-6 4H2v6h3l6 4V5Z" strokeLinejoin="round" />
      {enabled ? (
        <>
          <path
            d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path d="m16 9 6 6m0-6-6 6" strokeLinecap="round" />
      )}
    </svg>
  )
}

export function TourVoiceControls({
  compact = false,
  enabled,
  supported,
  speaking,
  paused,
  failed,
  onToggle,
  onReplay,
}: {
  compact?: boolean
  enabled: boolean
  supported: boolean
  speaking: boolean
  paused: boolean
  failed: boolean

  onToggle: () => void
  onReplay: () => void
}) {
  const hint = !supported
    ? "Voice narration is unavailable in this browser."
    : failed
      ? "Voice could not play. Turn it on to retry."
      : enabled
        ? "Turn off spoken walkthrough narration"
        : "Listen to each walkthrough step"

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={!supported}
        aria-pressed={enabled}
        aria-label={
          !supported
            ? "Voice narration unavailable"
            : enabled
              ? "Turn voice narration off"
              : "Turn voice narration on"
        }
        title={hint}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          enabled
            ? "bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25"
            : "text-white/65 hover:bg-white/10 hover:text-white"
        }`}
      >
        <VoiceIcon enabled={enabled} />
        <span>
          {!supported ? "No voice" : enabled ? "Voice on" : "Voice off"}
        </span>
        {speaking && (
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300"
            aria-hidden="true"
          />
        )}
      </button>
      {!compact && enabled && (
        <button
          type="button"
          onClick={onReplay}
          disabled={paused}
          title={
            paused
              ? "Resume the guide to replay narration"
              : "Read this step again"
          }
          aria-label="Replay this step’s narration"
          className="rounded-lg px-2 py-1.5 text-[10px] text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          Replay
        </button>
      )}
    </div>
  )
}
