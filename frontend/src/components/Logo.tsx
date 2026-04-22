interface LogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { uneq: 'text-xl', sub: 'text-[9px]', bar: 'h-5' },
  md: { uneq: 'text-3xl', sub: 'text-[11px]', bar: 'h-7' },
  lg: { uneq: 'text-5xl', sub: 'text-sm', bar: 'h-10' },
}

export default function Logo({ variant = 'dark', size = 'md' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-brand-dark'
  const s = sizes[size]

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col leading-none">
        <span className={`font-heading font-bold tracking-tight ${s.uneq} ${textColor}`}>
          UNEQ
        </span>
        <span
          className={`font-heading tracking-[0.2em] uppercase ${s.sub}`}
          style={{ color: '#FAB784' }}
        >
          Consulting
        </span>
      </div>
      <div className={`w-px ${s.bar}`} style={{ backgroundColor: '#FBB040' }} />
      <span
        className={`font-sans tracking-[0.15em] uppercase text-xs font-medium ${textColor} opacity-70`}
      >
        Urlaub
      </span>
    </div>
  )
}
