import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb, recomputeValorPago, type Lancamento, type FinTipo, type Categoria, type Cliente, type Ordem } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s: string | null) => { if (!s) return '—'; const p = s.slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s }
const hojeISO = () => new Date().toISOString().slice(0, 10)

export default function Financeiro() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Lancamento[]>([])
  const [cats, setCats] = useState<Categoria[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'receita' | 'despesa' | 'pendente'>('todos')
  const [edit, setEdit] = useState<Partial<Lancamento> | null>(null)

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const [l, c, cl, o] = await Promise.all([
      sb.from('financeiro_lancamentos').select('*').eq('tenant_id', tenant.id).order('vencimento', { ascending: false, nullsFirst: false }),
      sb.from('financeiro_categorias').select('*').eq('tenant_id', tenant.id).order('nome'),
      sb.from('clientes').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
      sb.from('ordens').select('id, numero, cliente_id').eq('tenant_id', tenant.id).order('numero', { ascending: false }),
    ])
    if (l.error) { setErro(true); setLoading(false); return }
    setLista((l.data as Lancamento[]) ?? [])
    setCats((c.data as Categoria[]) ?? [])
    setClientes((cl.data as Cliente[]) ?? [])
    setOrdens((o.data as Ordem[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const numOrdem = useMemo(() => { const m = new Map<string, number>(); ordens.forEach((o) => m.set(o.id, o.numero)); return m }, [ordens])
  const nomeCat = useMemo(() => { const m = new Map<string, string>(); cats.forEach((c) => m.set(c.id, c.nome)); return m }, [cats])

  const resumo = useMemo(() => {
    let recebido = 0, aReceber = 0, despesa = 0
    lista.forEach((x) => {
      if (x.tipo === 'receita') { if (x.pago) recebido += Number(x.valor) || 0; else aReceber += Number(x.valor) || 0 }
      else if (x.pago) despesa += Number(x.valor) || 0
    })
    return { recebido, aReceber, despesa }
  }, [lista])

  const visiveis = useMemo(() => {
    if (filtro === 'todos') return lista
    if (filtro === 'pendente') return lista.filter((x) => !x.pago)
    return lista.filter((x) => x.tipo === filtro)
  }, [lista, filtro])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        <Kpi label="Recebido" valor={resumo.recebido} cor="var(--ok)" />
        <Kpi label="A receber" valor={resumo.aReceber} cor="var(--gold)" />
        <Kpi label="Despesas pagas" valor={resumo.despesa} cor="var(--danger)" />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
          {([['todos', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas'], ['pendente', 'Pendentes']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={{ ...chip, ...(filtro === k ? chipOn : null) }}>{l}</button>
          ))}
        </div>
        <button className="at-btn" style={{ width: 'auto' }} onClick={() => setEdit({ tipo: 'receita', pago: true })}>+ Lançamento</button>
      </div>
      <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : visiveis.length === 0 ? (
          <Empty ico="💰" titulo="Nada por aqui" texto="Registre receitas e despesas do ateliê. Os pagamentos de ordens de serviço também aparecem aqui.">
            <button className="at-btn" style={{ width: 'auto' }} onClick={() => setEdit({ tipo: 'receita', pago: true })}>Novo lançamento</button>
          </Empty>
        ) : (
          <div className="at-tablewrap">
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Descrição', 'Categoria', 'Vencimento', 'Status', 'Valor', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{visiveis.map((x) => { const rec = x.tipo === 'receita'
                return (
                  <tr key={x.id}>
                    <td style={td}><b>{x.descricao || (rec ? 'Receita' : 'Despesa')}</b>{x.ordem_id && numOrdem.has(x.ordem_id) ? <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--plum)' }}>OS #{numOrdem.get(x.ordem_id)}</span> : null}</td>
                    <td style={td}>{x.categoria_id ? (nomeCat.get(x.categoria_id) ?? '—') : '—'}</td>
                    <td style={td}>{fmtDate(x.vencimento)}</td>
                    <td style={td}><span style={{ fontSize: 12, fontWeight: 700, color: x.pago ? 'var(--ok)' : 'var(--gold)', background: (x.pago ? '#16a34a' : '#b98325') + '1e', borderRadius: 999, padding: '2px 9px' }}>{x.pago ? 'Pago' : 'Pendente'}</span></td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums', color: rec ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>{rec ? '+' : '−'} {BRL(x.valor)}</td>
                    <td style={{ ...td, textAlign: 'right' }}><BtnSm onClick={() => setEdit(x)}>Editar</BtnSm></td>
                  </tr>
                ) })}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarLanc lanc={edit} cats={cats} clientes={clientes} ordens={ordens} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function Kpi({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="at-card" style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--tx3)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{BRL(valor)}</div>
    </div>
  )
}

function EditarLanc({ lanc, cats, clientes, ordens, onClose, onSaved }: { lanc: Partial<Lancamento>; cats: Categoria[]; clientes: Cliente[]; ordens: Ordem[]; onClose: () => void; onSaved: () => void }) {
  const { tenant } = useAuth()
  const toast = useToast()
  const [f, setF] = useState<Partial<Lancamento>>({ tipo: 'receita', pago: true, valor: 0, ...lanc })
  const [busy, setBusy] = useState(false)
  const editando = !!lanc.id
  const set = <K extends keyof Lancamento>(k: K, v: Lancamento[K]) => setF((s) => ({ ...s, [k]: v }))
  const catsDoTipo = cats.filter((c) => !c.tipo || c.tipo === f.tipo)

  async function salvar() {
    if (!tenant) return
    if (!(Number(f.valor) > 0)) { toast('Informe um valor.', true); return }
    setBusy(true)
    const dados = {
      tenant_id: tenant.id, tipo: (f.tipo ?? 'receita') as FinTipo, categoria_id: f.categoria_id || null,
      descricao: f.descricao || null, valor: Number(f.valor) || 0, vencimento: f.vencimento || null,
      pago: !!f.pago, pago_em: f.pago ? (f.pago_em || hojeISO()) : null,
      ordem_id: f.ordem_id || null, cliente_id: f.cliente_id || null,
    }
    const { error } = editando ? await sb.from('financeiro_lancamentos').update(dados).eq('id', lanc.id!) : await sb.from('financeiro_lancamentos').insert(dados)
    if (!error && dados.ordem_id) { try { await recomputeValorPago(dados.ordem_id) } catch { /* não bloqueia */ } }
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast('Lançamento salvo.'); onSaved()
  }

  async function excluir() {
    if (!editando) return
    setBusy(true)
    const { error } = await sb.from('financeiro_lancamentos').delete().eq('id', lanc.id!)
    if (!error && lanc.ordem_id) { try { await recomputeValorPago(lanc.ordem_id) } catch { /* segue */ } }
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast('Lançamento excluído.'); onSaved()
  }

  return (
    <Modal title={editando ? 'Editar lançamento' : 'Novo lançamento'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Tipo"><select style={inp} value={f.tipo ?? 'receita'} onChange={(e) => set('tipo', e.target.value as FinTipo)}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></Field>
        <Field label="Valor (R$)"><input style={inp} type="number" min="0" step="0.01" value={f.valor ?? 0} onChange={(e) => set('valor', Number(e.target.value))} /></Field>
      </div>
      <Field label="Descrição"><input style={inp} value={f.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Categoria"><select style={inp} value={f.categoria_id ?? ''} onChange={(e) => set('categoria_id', e.target.value || null)}><option value="">— sem categoria —</option>{catsDoTipo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
        <Field label="Vencimento"><input style={inp} type="date" value={f.vencimento ?? ''} onChange={(e) => set('vencimento', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Cliente"><select style={inp} value={f.cliente_id ?? ''} onChange={(e) => set('cliente_id', e.target.value || null)}><option value="">—</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
        <Field label="Ordem"><select style={inp} value={f.ordem_id ?? ''} onChange={(e) => set('ordem_id', e.target.value || null)}><option value="">—</option>{ordens.map((o) => <option key={o.id} value={o.id}>OS #{o.numero}</option>)}</select></Field>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: '4px 0 6px' }}>
        <input type="checkbox" checked={!!f.pago} onChange={(e) => set('pago', e.target.checked)} /> Pago
      </label>
      <Foot>
        {editando && <button onClick={() => void excluir()} disabled={busy} style={{ marginRight: 'auto', border: '1px solid var(--line)', background: '#fff', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontWeight: 600, cursor: 'pointer' }}>Excluir</button>}
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="at-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => void salvar()}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </Foot>
    </Modal>
  )
}

const chip: CSSProperties = { border: '1px solid var(--line)', background: '#fff', color: 'var(--tx2)', borderRadius: 999, padding: '5px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const chipOn: CSSProperties = { background: 'var(--plum)', color: '#fff', borderColor: 'var(--plum)' }
const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
