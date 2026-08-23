import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Field, Loading, errMsg, inp, useToast } from '../ui/kit'

// Máscara de telefone — espelha a do app vanilla (só dígitos, formata (DD) 9NNNN-NNNN).
function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/[-\s()]+$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

interface Settings {
  subtitulo: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  cnpj: string | null
  features: Record<string, unknown> | null
}

export default function Config() {
  const { tenant, role } = useAuth()
  const toast = useToast()
  const canEdit = role === 'owner' || role === 'gestor'
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState(tenant?.nome ?? '')
  const [st, setSt] = useState<Settings>({ subtitulo: '', telefone: '', whatsapp: '', email: '', cnpj: '', features: {} })
  const [busy, setBusy] = useState(false)
  const [busyPref, setBusyPref] = useState(false)

  useEffect(() => {
    let vivo = true
    async function carregar() {
      if (!tenant) return
      setLoading(true)
      setNome(tenant.nome)
      const { data } = await sb.from('tenant_settings').select('subtitulo, telefone, whatsapp, email, cnpj, features').eq('tenant_id', tenant.id).maybeSingle()
      if (!vivo) return
      const d = data as Settings | null
      setSt({
        subtitulo: d?.subtitulo ?? '', telefone: d?.telefone ?? '', whatsapp: d?.whatsapp ?? '',
        email: d?.email ?? '', cnpj: d?.cnpj ?? '', features: d?.features ?? {},
      })
      setLoading(false)
    }
    void carregar()
    return () => { vivo = false }
  }, [tenant])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSt((s) => ({ ...s, [k]: v }))

  async function salvarAtelie() {
    if (!tenant || !canEdit) return
    if (!nome.trim()) { toast('O nome do ateliê é obrigatório.', true); return }
    setBusy(true)
    const r1 = await sb.from('tenants').update({ nome: nome.trim() }).eq('id', tenant.id)
    const r2 = await sb.from('tenant_settings').upsert({
      tenant_id: tenant.id,
      subtitulo: st.subtitulo || null, telefone: st.telefone || null, whatsapp: st.whatsapp || null,
      email: st.email || null, cnpj: st.cnpj || null,
    })
    setBusy(false)
    if (r1.error || r2.error) { toast(errMsg(r1.error || r2.error), true); return }
    if (tenant) tenant.nome = nome.trim()
    toast('Dados do ateliê salvos.')
  }

  const saudacaoLigada = (st.features?.saudacao_diaria as boolean | undefined) !== false
  async function alternarSaudacao(v: boolean) {
    if (!tenant || !canEdit) return
    const novo = { ...(st.features ?? {}), saudacao_diaria: v }
    set('features', novo); setBusyPref(true)
    const { error } = await sb.from('tenant_settings').update({ features: novo }).eq('tenant_id', tenant.id)
    setBusyPref(false)
    if (error) { set('features', { ...(st.features ?? {}), saudacao_diaria: !v }); toast(errMsg(error), true); return }
    toast(v ? 'Mensagem de boas-vindas ativada.' : 'Mensagem de boas-vindas desativada.')
  }

  if (loading) return <Loading />

  const dis = !canEdit
  const fieldRO = dis ? { ...inp, background: 'var(--bg)', color: 'var(--tx2)' } : inp

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="at-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Ateliê</div>
        <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 14px' }}>Informações do seu ateliê (aparecem no sistema e nas impressões).</p>
        <Field label="Nome do ateliê"><input style={fieldRO} value={nome} disabled={dis} onChange={(e) => setNome(e.target.value)} /></Field>
        <Field label="Subtítulo"><input style={fieldRO} value={st.subtitulo ?? ''} disabled={dis} onChange={(e) => set('subtitulo', e.target.value)} placeholder="Ex.: Ajustes, reformas e sob medida" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Telefone"><input style={fieldRO} value={st.telefone ?? ''} disabled={dis} onChange={(e) => set('telefone', maskPhone(e.target.value))} /></Field>
          <Field label="WhatsApp"><input style={fieldRO} value={st.whatsapp ?? ''} disabled={dis} onChange={(e) => set('whatsapp', maskPhone(e.target.value))} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="E-mail"><input style={fieldRO} value={st.email ?? ''} disabled={dis} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="CNPJ (opcional)"><input style={fieldRO} value={st.cnpj ?? ''} disabled={dis} onChange={(e) => set('cnpj', e.target.value)} /></Field>
        </div>
        {canEdit ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="at-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvarAtelie()}>{busy ? 'Salvando…' : 'Salvar dados do ateliê'}</button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--tx2)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', marginTop: 6 }}>Somente a administração pode editar estes dados.</div>
        )}
      </div>

      <div className="at-card" style={{ padding: 20 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Preferências</div>
        <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 6px' }}>Pequenos ajustes de experiência do sistema.</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Mensagem de boas-vindas</div>
            <div style={{ fontSize: 13, color: 'var(--tx2)' }}>Exibe uma saudação no topo da tela inicial, uma vez por dia.</div>
          </div>
          <button
            type="button" role="switch" aria-checked={saudacaoLigada} aria-label="Mensagem de boas-vindas"
            disabled={busyPref || !canEdit} onClick={() => void alternarSaudacao(!saudacaoLigada)}
            style={{ position: 'relative', width: 50, height: 28, borderRadius: 999, border: 0, flex: '0 0 auto', cursor: busyPref || !canEdit ? 'default' : 'pointer', opacity: busyPref || !canEdit ? 0.6 : 1, background: saudacaoLigada ? 'var(--purple)' : '#c9c2cb', transition: 'background .2s' }}
          >
            <span style={{ position: 'absolute', top: 3, left: saudacaoLigada ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </button>
        </div>
        {!canEdit && <div style={{ fontSize: 13, color: 'var(--tx2)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>Somente a administração pode alterar as preferências.</div>}
      </div>
    </div>
  )
}
