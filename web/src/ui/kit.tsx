import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'

export const inp: CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
  borderRadius: 10, fontSize: 15, background: '#fff', color: 'var(--ink)',
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  )
}

export function Foot({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>{children}</div>
}

export function BtnGhost({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} style={{ border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', font: 'inherit' }}>{children}</button>
}
export function BtnSm({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} style={{ border: '1px solid var(--line)', background: '#fff', color: 'var(--plum)', borderRadius: 8, padding: '5px 11px', fontWeight: 600, fontSize: 13, cursor: 'pointer', font: 'inherit' }}>{children}</button>
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color, background: color + '1e', borderRadius: 999, padding: '2px 10px' }}>{children}</span>
}

export function Loading() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>Carregando…</div>
}

export function ErroCarregar({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ padding: 34, textAlign: 'center', color: 'var(--tx2)' }}>
      <div style={{ marginBottom: 10 }}>Não foi possível carregar.</div>
      <BtnSm onClick={onRetry}>Tentar de novo</BtnSm>
    </div>
  )
}

export function Empty({ ico, titulo, texto, children }: { ico: string; titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>{ico}</div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 14, color: 'var(--tx2)', maxWidth: 420, margin: '0 auto 14px', lineHeight: 1.5 }}>{texto}</div>
      {children}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(46,43,49,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 16px 16px', overflow: 'auto' }}>
      <div className="at-card" style={{ maxWidth: 460, width: '100%', padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,var(--plum),var(--plum-deep))', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <b style={{ flex: 1, fontFamily: 'Fraunces, serif', fontSize: 17 }}>{title}</b>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  )
}

export function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Ocorreu um erro. Tente de novo.'
}

// Toast simples via estado local do componente que o usa.
export function useToast() {
  const [, force] = useState(0)
  return useCallback((msg: string, erro = false) => {
    const el = document.createElement('div')
    el.textContent = msg
    el.style.cssText = `position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2000;background:${erro ? 'var(--danger)' : 'var(--plum)'};color:#fff;padding:11px 18px;border-radius:12px;font-weight:600;box-shadow:0 12px 30px -10px rgba(0,0,0,.5);font-size:14px`
    document.body.appendChild(el)
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0' }, 2200)
    setTimeout(() => { el.remove(); force((n) => n + 1) }, 2600)
  }, [])
}
