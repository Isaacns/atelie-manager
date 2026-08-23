import { useState } from 'react'
import { sb } from '../lib/supabase'
import { errMsg } from '../ui/kit'
import { BrandLogo, ByVizio, LivingBg } from '../ui/brand'

// Tela de login — réplica visual do login do app vanilla (glass card, marca
// respirando, tipografia Cormorant Garamond, campo de senha com mostrar/ocultar).
// Comportamento preservado do piloto React: e-mail + senha via signInWithPassword.
export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
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
    <>
      <LivingBg />
      <div className="center">
        <div className="glass card">
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10 }}><BrandLogo size={120} /></div>
          <h1 className="title">Bem-vinda de volta</h1>
          <div className="sub">Acesse o painel do seu ateliê.</div>
          <form onSubmit={entrar}>
            {erro && <div className="err">{erro}</div>}
            <label>E-mail</label>
            <input type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Senha</label>
            <div className="field">
              <input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              <button type="button" className="toggle" onClick={() => setShow((s) => !s)}>{show ? 'ocultar' : 'mostrar'}</button>
            </div>
            <button className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>
          <div className="foot"><ByVizio /></div>
        </div>
      </div>
    </>
  )
}
