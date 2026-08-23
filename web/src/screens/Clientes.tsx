import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb, MEDIDAS, type Cliente } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

export default function Clientes() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [edit, setEdit] = useState<Partial<Cliente> | null>(null)

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('clientes').select('*').eq('tenant_id', tenant.id).order('nome')
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as Cliente[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return lista
    return lista.filter((c) =>
      c.nome.toLowerCase().includes(t) ||
      (c.whatsapp ?? '').includes(t) || (c.telefone ?? '').includes(t) ||
      (c.cpf ?? '').includes(t) || (c.cidade ?? '').toLowerCase().includes(t),
    )
  }, [lista, busca])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input style={{ ...inp, width: 'auto', flex: '1 1 220px', maxWidth: 340 }} placeholder="Buscar por nome, WhatsApp, CPF, cidade…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{visiveis.length} cliente(s)</span>
        <button className="at-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo cliente</button>
      </div>
      <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : visiveis.length === 0 ? (
          <Empty ico="🧵" titulo="Nenhum cliente" texto="Cadastre quem contrata seus serviços de costura. As medidas e o histórico de ordens ficam vinculados ao cliente.">
            <button className="at-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar cliente</button>
          </Empty>
        ) : (
          <div className="at-tablewrap">
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Nome', 'Contato', 'CPF', 'Cidade', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{visiveis.map((c) => (
                <tr key={c.id}>
                  <td style={td}><b>{c.nome}</b>{c.medidas && Object.keys(c.medidas).length > 0 && <span title="Tem medidas cadastradas" style={{ marginLeft: 6, fontSize: 12 }}>📐</span>}</td>
                  <td style={td}>{[c.whatsapp, c.telefone].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={td}>{c.cpf || '—'}</td>
                  <td style={td}>{[c.bairro, c.cidade].filter(Boolean).join(', ') || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}><BtnSm onClick={() => setEdit(c)}>Editar</BtnSm></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarCliente cliente={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarCliente({ cliente, onClose, onSaved }: { cliente: Partial<Cliente>; onClose: () => void; onSaved: () => void }) {
  const { tenant } = useAuth()
  const toast = useToast()
  const [f, setF] = useState<Partial<Cliente>>({ ...cliente })
  const [busy, setBusy] = useState(false)
  const editando = !!cliente.id
  const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) => setF((s) => ({ ...s, [k]: v }))
  const med = (f.medidas ?? {}) as Record<string, string>
  const setMed = (k: string, v: string) => setF((s) => ({ ...s, medidas: { ...(s.medidas ?? {}), [k]: v } }))

  async function salvar() {
    if (!tenant) return
    if (!f.nome?.trim()) { toast('Nome é obrigatório.', true); return }
    setBusy(true)
    // remove chaves de medida vazias antes de gravar
    const medLimpo: Record<string, string> = {}
    Object.entries(med).forEach(([k, v]) => { if (String(v ?? '').trim()) medLimpo[k] = String(v).trim() })
    const dados = {
      tenant_id: tenant.id, nome: f.nome.trim(),
      whatsapp: f.whatsapp || null, telefone: f.telefone || null, cpf: f.cpf || null,
      nascimento: f.nascimento || null, cep: f.cep || null, endereco: f.endereco || null,
      bairro: f.bairro || null, cidade: f.cidade || null, observacoes: f.observacoes || null,
      medidas: Object.keys(medLimpo).length ? medLimpo : null,
    }
    const { error } = editando
      ? await sb.from('clientes').update(dados).eq('id', cliente.id!)
      : await sb.from('clientes').insert(dados)
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast('Cliente salvo.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="WhatsApp"><input style={inp} value={f.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
        <Field label="Telefone"><input style={inp} value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="CPF"><input style={inp} value={f.cpf ?? ''} onChange={(e) => set('cpf', e.target.value)} /></Field>
        <Field label="Nascimento"><input style={inp} type="date" value={f.nascimento ?? ''} onChange={(e) => set('nascimento', e.target.value)} /></Field>
      </div>
      <Field label="Endereço"><input style={inp} value={f.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Bairro"><input style={inp} value={f.bairro ?? ''} onChange={(e) => set('bairro', e.target.value)} /></Field>
        <Field label="Cidade"><input style={inp} value={f.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} /></Field>
        <Field label="CEP"><input style={inp} value={f.cep ?? ''} onChange={(e) => set('cep', e.target.value)} /></Field>
      </div>
      <div style={{ margin: '4px 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--plum)', letterSpacing: '.02em' }}>📐 Medidas (cm)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        {MEDIDAS.map((m) => (
          <label key={m.k} style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--tx2)', marginBottom: 3 }}>{m.label}</span>
            <input style={{ ...inp, padding: '8px 10px' }} inputMode="decimal" value={med[m.k] ?? ''} onChange={(e) => setMed(m.k, e.target.value)} placeholder="—" />
          </label>
        ))}
      </div>
      <Field label="Observações"><input style={inp} value={f.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} /></Field>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="at-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </Foot>
    </Modal>
  )
}

const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
