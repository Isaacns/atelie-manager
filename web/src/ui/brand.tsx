import type { CSSProperties } from 'react'

// Assets de marca (copiados para web/public → servidos sob /app/).
const BASE = import.meta.env.BASE_URL
export const LOGO = BASE + 'costureira-logo.jpg'
export const VIZIO_DARK = BASE + 'vizio-dark.svg'

// Ícones (paths idênticos ao mapa `I` do vanilla).
export const I: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 11a3 3 0 1 0 0-6M21 20v-1a3.6 3.6 0 0 0-3-3.5',
  scissors: 'M6 6l12 12M6 18L18 6M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  box: 'M21 8 12 3 3 8m18 0-9 5-9-5m18 0v8l-9 5-9-5V8',
  money: 'M3 6h18v12H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6 9h.01M18 15h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  file: 'M14 3v5h5M14 3H6v18h12V8zM9 13h6M9 17h4',
  tag: 'M20.6 13.4 13 21l-9-9V4h8l8.6 8.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2 2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9Z',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 6h16M4 12h16M4 18h16',
  back: 'M15 18l-6-6 6-6',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  rocket: 'M5 15c-1.6 1.6-2 5.5-2 5.5s3.9-.4 5.5-2M9 11a5 5 0 0 0 4 4l6-6a6 6 0 0 0 1.5-5.5A6 6 0 0 0 15 5l-6 6ZM15.5 8.5h.01',
  spark: 'M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3ZM19 14l.9 2.3L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.7L19 14Z',
}

export function Ic({ d, cls, style }: { d: string; cls?: string; style?: CSSProperties }) {
  return (
    <svg className={cls} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

// Logo do tenant: círculo com anel de história, respirando (breathe-img).
export function BrandLogo({ size = 40, cls = '' }: { size?: number; cls?: string }) {
  return <img className={'brandmark breathe-img ' + cls} src={LOGO} width={size} height={size} alt="Costureira Salvador" />
}

// Assinatura "Ateliê Manager By Vizio".
export function ByVizio() {
  return <span className="byvizio">Ateliê Manager <b>By</b> <img className="vzfloat" src={VIZIO_DARK} alt="Vizio" /></span>
}

// Fundo vivo (orbs) — padrão VIZIO, fixo atrás de tudo.
export function LivingBg() {
  return (
    <div className="living" aria-hidden="true">
      <div className="orb a" /><div className="orb b" /><div className="orb c" />
    </div>
  )
}
