import { Stethoscope } from 'lucide-react'

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Stethoscope className="h-4 w-4" />
      </span>
      <span className="text-lg font-semibold tracking-[-0.01em] text-foreground">
        Bourgelat
      </span>
    </span>
  )
}
