interface Props {
  src: string
}

export function VideoPlayer({ src }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between">
        <div>
          <div className="label">Recording</div>
          <div className="text-sm font-medium text-ink-700">Screen capture</div>
        </div>
        <span className="text-[11px] text-ink-400 font-mono">{src.split("/").pop()}</span>
      </div>
      <div className="bg-ink-900 aspect-[9/16] max-h-[520px] grid place-items-center">
        <video
          controls
          src={src}
          className="max-h-full max-w-full"
          preload="metadata"
        />
      </div>
    </div>
  )
}
