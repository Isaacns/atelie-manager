import { useState } from 'react'
import { sb } from '../lib/supabase'
import { errMsg, useToast, Modal, Foot, BtnGhost, inp } from '../ui/kit'
import { BrandLogo, ByVizio, LivingBg } from '../ui/brand'

// Tela de login — réplica visual do login do app vanilla (glass card, marca
// respirando, tipografia Cormorant Garamond, campo de senha com mostrar/ocultar,
// link "Esqueci minha senha"). Comportamento preservado do piloto React:
// e-mail + senha via signInWithPassword.
export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [recuperar, setRecuperar] = useState(false)

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
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" className="link" style={{ fontSize: '.88rem', opacity: 0.9 }} onClick={() => setRecuperar(true)}>Esqueci minha senha</button>
          </div>
          <div className="foot"><ByVizio /></div>
        </div>
      </div>
      {recuperar && <EsqueciSenha onClose={() => setRecuperar(false)} />}
    </>
  )
}

// Recuperação de acesso — espelha o EsqueciSenha do vanilla: valida e-mail e
// chama supabase.auth.resetPasswordForEmail. O link do e-mail volta para a raiz
// do site (app vanilla), que já processa a criação da nova senha.
function EsqueciSenha({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [u, setU] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  async function enviar() {
    const val = (u || '').trim()
    if (!val) { toast('Informe seu e-mail cadastrado.', true); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) { toast('Para recuperar a senha, informe o seu e-mail (não o nome de usuário).', true); return }
    setBusy(true)
    const redirect = location.origin + '/'
    const { error } = await sb.auth.resetPasswordForEmail(val, { redirectTo: redirect })
    setBusy(false)
    if (error) { toast('Não foi possível enviar agora. Tente novamente em instantes.', true); return }
    setOk(true)
  }

  return (
    <Modal title="Recuperar acesso" onClose={onClose}>
      {ok ? (
        <>
          <p style={{ marginTop: 0, color: '#5a525c' }}>Se houver uma conta com esse e-mail, enviamos um <b>link para redefinir a senha</b>. Confira a caixa de entrada (e o spam). Ao abrir o link, você cria uma nova senha e já entra no sistema.</p>
          <Foot><button className="btn pri" onClick={onClose}>Entendi</button></Foot>
        </>
      ) : (
        <>
          <p style={{ marginTop: 0, color: '#5a525c' }}>Informe o <b>e-mail cadastrado</b> e enviaremos um link para você criar uma nova senha.</p>
          <label>E-mail</label>
          <input style={inp} type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={u} onChange={(e) => setU(e.target.value)} placeholder="seu@email.com" />
          <Foot>
            <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
            <button className="btn pri" disabled={busy} onClick={() => void enviar()}>{busy ? 'Enviando…' : 'Enviar link'}</button>
          </Foot>
        </>
      )}
    </Modal>
  )
}
