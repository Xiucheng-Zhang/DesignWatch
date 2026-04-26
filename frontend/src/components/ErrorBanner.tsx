interface Props {
  message: string
}

export function ErrorBanner({ message }: Props) {
  return (
    <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-12">
      <div className="card p-6 border-rose-200 bg-rose-50">
        <div className="font-medium text-rose-800">Something went wrong</div>
        <div className="mt-1 text-sm text-rose-700">{message}</div>
      </div>
    </div>
  )
}
