import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Field, Loading, errMsg, inp, useToast } from '../ui/kit'

// Tratamento por gênero vem do perfil (profiles.genero), nunca fixo no código — igual ao vanilla.
type Genero = 'feminino' | 'masculino' | 'neutro'
const PAPEIS: Record<string, Record<Genero, string>> = {
  owner: { feminino: 'Administradora', masculino: 'Administrador', neutro: 'Administração' },
  gestor: { feminino: 'Gestora', masculino: 'Gestor', neutro: 'Gestão' },
  financeiro: { feminino: 'Financeiro', masculino: 'Financeiro', neutro: 'Financeiro' },
  atendente: { feminino: 'Atendente', masculino: 'Atendente', neutro: 'Atendimento' },
  costureira: { feminino: 'Costureira', masculino: 'Costureiro', neutro: 'Costura' },
  estoque: { feminino: 'Estoque', masculino: 'Estoque', neutro: 'Estoque' },
}
const papelDe = (role: string | null, g: Genero) => (role && PAPEIS[role]?.[g]) || role || '—'

interface Profile { id: string; nome: string | null; genero: Genero }

export default function Perfil() {
  const { session, role } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [genero, setGenero] = useState<Genero>('feminino')
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [busy, setBusy] = useState(false)
  const email = session?.user.email ?? '—'

  useEffect(() => {
    let vivo = true
    async function carregar() {
      if (!session) return
      setLoading(true)
      const { data } = await sb.from('profiles').select('id, nome, genero').eq('id', session.user.id).maybeSingle()
      if (!vivo) return
      const p = data as Profile | null
      setNome(p?.nome ?? '')
      setGenero((p?.genero as Genero) ?? 'feminino')
      setLoading(false)
    }
    void carregar()
    return () => { vivo = false }
  }, [session])

  async function salvar() {
    if (!session) return
    if (!nome.trim()) { toast('Escreva seu nome.', true); return }
    if (s1 || s2) {
      if (s1.length < 6) { toast('A senha nova precisa ter pelo menos 6 caracteres.', true); return }
      if (s1 !== s2) { toast('As duas senhas não são iguais.', true); return }
    }
    setBusy(true)
    const { error } = await sb.from('profiles').update({ nome: nome.trim(), genero }).eq('id', session.user.id)
    if (error) { setBusy(false); toast(errMsg(error), true); return }
    if (s1) {
      const r = await sb.auth.updateUser({ password: s1 })
      if (r.error) { setBusy(false); toast(errMsg(r.error), true); return }
      setS1(''); setS2('')
      setBusy(false); toast('Perfil e senha atualizados.'); return
    }
    setBusy(false); toast('Perfil atualizado.')
  }

  if (loading) return <Loading />

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="at-card" style={{ padding: 20, marginBottom: 16 }}>
        <Field label="Nome"><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" /></Field>
        <Field label="Como prefere ser tratado(a)">
          <select style={inp} value={genero} onChange={(e) => setGenero(e.target.value as Genero)}>
            <option value="feminino">Feminino — "Bem-vinda, Administradora"</option>
            <option value="masculino">Masculino — "Bem-vindo, Administrador"</option>
            <option value="neutro">Neutro — sem flexão</option>
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="E-mail"><input style={{ ...inp, background: 'var(--bg)', color: 'var(--tx2)' }} value={email} disabled /></Field>
          <Field label="Perfil de acesso"><input style={{ ...inp, background: 'var(--bg)', color: 'var(--tx2)' }} value={papelDe(role, genero)} disabled /></Field>
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>O e-mail e o perfil de acesso são definidos pela administração do sistema.</div>
      </div>

      <div className="at-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Trocar minha senha</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nova senha"><input style={inp} type="password" value={s1} onChange={(e) => setS1(e.target.value)} placeholder="Mínimo 6 caracteres" /></Field>
          <Field label="Repita a nova senha"><input style={inp} type="password" value={s2} onChange={(e) => setS2(e.target.value)} /></Field>
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Deixe em branco para manter a senha atual.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="at-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </div>
  )
}
