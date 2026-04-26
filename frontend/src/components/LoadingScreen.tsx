export function LoadingScreen() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-32 grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-ink-500">
        <div className="size-10 rounded-full border-2 border-ink-200 border-t-accent-600 animate-spin" />
        <div className="text-sm">Loading sample analysis…</div>
      </div>
    </div>
  )
}
