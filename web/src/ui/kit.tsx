import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'

export const inp: CSSProperties = {
  width: '100%', border: '1px solid var(--border)',
  borderRadius: '.6rem', fontSize: '.95rem', background: 'rgba(255,255,255,.75)', color: 'var(--fg)',
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
    <div style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{ico}</div>
      <h4 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 19, fontWeight: 600, marginBottom: 6, color: 'var(--fg)' }}>{titulo}</h4>
      <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 14px', lineHeight: 1.5 }}>{texto}</div>
      {children}
    </div>
  )
}

// Modal no molde do vanilla: overlay .ov + cartão .modal com cabeçalho .mh
// (serif) e miolo .mb rolável. Fecha ao clicar fora.
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="ov" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="mh">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="mb">{children}</div>
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
