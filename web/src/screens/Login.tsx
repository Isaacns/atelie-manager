import { useState } from 'react'
import { sb } from '../lib/supabase'
import { inp, errMsg } from '../ui/kit'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErro('')
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha })
    setBusy(false)
    if (error) setErro(errMsg(error))
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form onSubmit={entrar} className="at-card" style={{ width: '100%', maxWidth: 380, padding: 26 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 600, color: 'var(--plum)' }}>Ateliê Manager</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 2 }}>Acesso restrito · piloto React</div>
        </div>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }}>E-mail</span>
          <input style={inp} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }}>Senha</span>
          <input style={inp} type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {erro && <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>{erro}</div>}
        <button className="at-btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: 'center', marginTop: 14 }}>Use o mesmo login do Ateliê.</div>
      </form>
    </div>
  )
}
