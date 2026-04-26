import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return "—"
  return `${seconds.toFixed(2)}s`
}
