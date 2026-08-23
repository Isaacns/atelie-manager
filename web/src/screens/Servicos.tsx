import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb, type Servico } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Badge, BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Servicos() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Servico[]>([])
  const [busca, setBusca] = useState('')
  const [edit, setEdit] = useState<Partial<Servico> | null>(null)

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('servicos').select('*').eq('tenant_id', tenant.id).order('nome')
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as Servico[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return t ? lista.filter((s) => s.nome.toLowerCase().includes(t) || (s.descricao ?? '').toLowerCase().includes(t)) : lista
  }, [lista, busca])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input style={{ ...inp, width: 'auto', flex: '1 1 220px', maxWidth: 340 }} placeholder="Buscar serviço…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{visiveis.length} serviço(s)</span>
        <button className="at-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo serviço</button>
      </div>
      <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : visiveis.length === 0 ? (
          <Empty ico="✂️" titulo="Nenhum serviço" texto="Cadastre seus serviços com preço base (ajuste de barra, entorno de vestido, conserto de zíper…). Eles viram itens nas ordens de serviço.">
            <button className="at-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar serviço</button>
          </Empty>
        ) : (
          <div className="at-tablewrap">
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Serviço', 'Preço base', 'Situação', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{visiveis.map((s) => (
                <tr key={s.id}>
                  <td style={td}><b>{s.nome}</b>{s.descricao ? <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{s.descricao}</div> : null}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{BRL(s.preco_base)}</td>
                  <td style={td}><Badge color={s.ativo ? '#16a34a' : '#94a3b8'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td style={{ ...td, textAlign: 'right' }}><BtnSm onClick={() => setEdit(s)}>Editar</BtnSm></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarServico servico={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarServico({ servico, onClose, onSaved }: { servico: Partial<Servico>; onClose: () => void; onSaved: () => void }) {
  const { tenant } = useAuth()
  const toast = useToast()
  const [f, setF] = useState<Partial<Servico>>({ ativo: true, preco_base: 0, ...servico })
  const [busy, setBusy] = useState(false)
  const editando = !!servico.id
  const set = <K extends keyof Servico>(k: K, v: Servico[K]) => setF((s) => ({ ...s, [k]: v }))

  async function salvar() {
    if (!tenant) return
    if (!f.nome?.trim()) { toast('Nome do serviço é obrigatório.', true); return }
    setBusy(true)
    const dados = { tenant_id: tenant.id, nome: f.nome.trim(), descricao: f.descricao || null, preco_base: Number(f.preco_base) || 0, ativo: f.ativo ?? true }
    const { error } = editando ? await sb.from('servicos').update(dados).eq('id', servico.id!) : await sb.from('servicos').insert(dados)
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast('Serviço salvo.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar serviço' : 'Novo serviço'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Ajuste de barra" /></Field>
      <Field label="Descrição"><input style={inp} value={f.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Preço base (R$)"><input style={inp} type="number" min="0" step="0.01" value={f.preco_base ?? 0} onChange={(e) => set('preco_base', Number(e.target.value))} /></Field>
        <Field label="Situação"><select style={inp} value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativo</option><option value="0">Inativo</option></select></Field>
      </div>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="at-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </Foot>
    </Modal>
  )
}

const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
