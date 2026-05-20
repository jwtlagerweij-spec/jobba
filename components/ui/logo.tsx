import { cn } from '@/lib/utils'

/**
 * Three ascending bars — communicates "ranked matches", career growth, upward trajectory.
 * Core idea of Jobba: your best jobs, sorted by fit.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 26 20"
      fill="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <rect x="0" y="13" width="6" height="7" rx="2" opacity="0.35" />
      <rect x="10" y="7" width="6" height="13" rx="2" opacity="0.65" />
      <rect x="20" y="0" width="6" height="20" rx="2" />
    </svg>
  )
}

export function Logo({ className, iconClassName, textClassName }: {
  className?: string
  iconClassName?: string
  textClassName?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={cn('h-5 w-auto text-primary', iconClassName)} />
      <span className={cn('font-bold text-lg tracking-tight leading-none', textClassName)}>
        Jobba
      </span>
    </div>
  )
}
