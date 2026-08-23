import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb, OS_STATUS, recomputeValorPago, type Ordem, type OSStatus, type Cliente, type Servico, type OrdemItem } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s: string | null) => { if (!s) return '—'; const p = s.slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : s }
const hojeISO = () => new Date().toISOString().slice(0, 10)
const stInfo = (v: OSStatus) => OS_STATUS.find((s) => s.v === v) ?? { v, label: v, cor: '#8a7e86' }
const ABERTAS: OSStatus[] = ['orcamento', 'aberto', 'em_andamento', 'costurando', 'aguardando_prova', 'aguardando_retirada']

export default function Ordens() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [filtro, setFiltro] = useState<'ativas' | 'todas' | OSStatus>('ativas')
  const [edit, setEdit] = useState<Partial<Ordem> | null>(null)

  const nomeCliente = useMemo(() => {
    const m = new Map<string, string>()
    clientes.forEach((c) => m.set(c.id, c.nome))
    return m
  }, [clientes])

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const [o, c, s] = await Promise.all([
      sb.from('ordens').select('id, tenant_id, numero, cliente_id, status, descricao, valor, valor_pago, data_entrada, prazo, data_prova, atrasado, observacoes').eq('tenant_id', tenant.id).order('numero', { ascending: false }),
      sb.from('clientes').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
      sb.from('servicos').select('id, tenant_id, nome, descricao, preco_base, ativo').eq('tenant_id', tenant.id).eq('ativo', true).order('nome'),
    ])
    if (o.error || c.error || s.error) { setErro(true); setLoading(false); return }
    setOrdens((o.data as Ordem[]) ?? [])
    setClientes((c.data as Cliente[]) ?? [])
    setServicos((s.data as Servico[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const visiveis = useMemo(() => {
    if (filtro === 'todas') return ordens
    if (filtro === 'ativas') return ordens.filter((o) => ABERTAS.includes(o.status))
    return ordens.filter((o) => o.status === filtro)
  }, [ordens, filtro])

  const cont = useMemo(() => {
    const c: Record<string, number> = { ativas: ordens.filter((o) => ABERTAS.includes(o.status)).length, todas: ordens.length }
    OS_STATUS.forEach((s) => { c[s.v] = ordens.filter((o) => o.status === s.v).length })
    return c
  }, [ordens])

  const chips: { k: 'ativas' | 'todas' | OSStatus; label: string }[] = [
    { k: 'ativas', label: 'Ativas' }, { k: 'todas', label: 'Todas' },
    ...OS_STATUS.filter((s) => cont[s.v] > 0).map((s) => ({ k: s.v, label: s.label })),
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {chips.map((ch) => (
            <button key={ch.k} onClick={() => setFiltro(ch.k)} style={{ ...chip, ...(filtro === ch.k ? chipOn : null) }}>
              {ch.label} <span style={{ opacity: .7 }}>{cont[ch.k] ?? 0}</span>
            </button>
          ))}
        </div>
        <button className="at-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>+ Nova ordem</button>
      </div>
      <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : visiveis.length === 0 ? (
          <Empty ico="🪡" titulo="Nenhuma ordem" texto="As ordens de serviço acompanham cada peça — do orçamento à entrega — com prazo, prova e status.">
            <button className="at-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Nova ordem</button>
          </Empty>
        ) : (
          <div className="at-tablewrap">
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['OS', 'Cliente', 'Status', 'Entrada', 'Prazo', 'Valor', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{visiveis.map((o) => { const si = stInfo(o.status); const atrasada = o.atrasado && ABERTAS.includes(o.status)
                return (
                  <tr key={o.id}>
                    <td style={td}><b>#{o.numero}</b></td>
                    <td style={td}>{o.cliente_id ? (nomeCliente.get(o.cliente_id) ?? '—') : '—'}<div style={{ fontSize: 12, color: 'var(--tx3)' }}>{(o.descricao ?? '').slice(0, 40)}</div></td>
                    <td style={td}><span style={{ fontSize: 12, fontWeight: 700, color: si.cor, background: si.cor + '1e', borderRadius: 999, padding: '2px 10px' }}>{si.label}</span></td>
                    <td style={td}>{fmtDate(o.data_entrada)}</td>
                    <td style={{ ...td, color: atrasada ? 'var(--danger)' : undefined, fontWeight: atrasada ? 700 : undefined }}>{fmtDate(o.prazo)}{atrasada ? ' ⚠' : ''}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{BRL(o.valor)}</td>
                    <td style={{ ...td, textAlign: 'right' }}><BtnSm onClick={() => setEdit(o)}>Abrir</BtnSm></td>
                  </tr>
                ) })}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarOrdem ordem={edit} clientes={clientes} servicos={servicos} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarOrdem({ ordem, clientes, servicos, onClose, onSaved }: { ordem: Partial<Ordem>; clientes: Cliente[]; servicos: Servico[]; onClose: () => void; onSaved: () => void }) {
  const { tenant } = useAuth()
  const toast = useToast()
  const [f, setF] = useState<Partial<Ordem>>({ status: 'aberto', data_entrada: hojeISO(), valor: 0, ...ordem })
  const [itens, setItens] = useState<OrdemItem[]>([])
  const [addSel, setAddSel] = useState('')
  const [busy, setBusy] = useState(false)
  const editando = !!ordem.id
  const valorPago = Number(ordem.valor_pago) || 0
  const saldo = Math.max(0, (Number(ordem.valor) || 0) - valorPago)
  const [pagVal, setPagVal] = useState<string>('')
  const [pagBusy, setPagBusy] = useState(false)
  const set = <K extends keyof Ordem>(k: K, v: Ordem[K]) => setF((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    let vivo = true
    if (!editando) return
    void (async () => {
      const { data } = await sb.from('ordem_itens').select('*').eq('ordem_id', ordem.id!).order('posicao')
      if (vivo) setItens((data as OrdemItem[]) ?? [])
    })()
    return () => { vivo = false }
  }, [])

  const total = useMemo(() => itens.reduce((s, it) => s + (Number(it.quantidade) || 0) * (Number(it.valor_unit) || 0), 0), [itens])
  const temItens = itens.length > 0

  function addServico(id: string) {
    const sv = servicos.find((s) => s.id === id); if (!sv) return
    setItens((arr) => [...arr, { servico_id: sv.id, descricao: sv.nome, quantidade: 1, valor_unit: Number(sv.preco_base) || 0, posicao: arr.length }])
    setAddSel('')
  }
  function addLivre() { setItens((arr) => [...arr, { servico_id: null, descricao: '', quantidade: 1, valor_unit: 0, posicao: arr.length }]) }
  function updItem(i: number, patch: Partial<OrdemItem>) { setItens((arr) => arr.map((it, k) => k === i ? { ...it, ...patch } : it)) }
  function rmItem(i: number) { setItens((arr) => arr.filter((_, k) => k !== i)) }

  async function salvar() {
    if (!tenant) return
    setBusy(true)
    const valorFinal = temItens ? total : (Number(f.valor) || 0)
    const base = {
      cliente_id: f.cliente_id || null, status: f.status ?? 'aberto',
      descricao: f.descricao || null, valor: valorFinal,
      data_entrada: f.data_entrada || hojeISO(), prazo: f.prazo || null, data_prova: f.data_prova || null,
      observacoes: f.observacoes || null,
    }
    let error = null as unknown
    let ordemId = ordem.id
    if (editando) {
      const r = await sb.from('ordens').update(base).eq('id', ordem.id!)
      error = r.error
    } else {
      // numero é atribuído pelo trigger trg_ordens_numero (BEFORE INSERT) no banco.
      const r = await sb.from('ordens').insert({ tenant_id: tenant.id, ...base }).select('id').single()
      error = r.error; ordemId = r.data?.id
    }
    if (!error && ordemId) {
      await sb.from('ordem_itens').delete().eq('ordem_id', ordemId)
      if (itens.length) {
        const rows = itens.map((it, i) => ({
          tenant_id: tenant.id, ordem_id: ordemId, servico_id: it.servico_id || null,
          descricao: (it.descricao || '').trim() || 'Item', quantidade: Number(it.quantidade) || 0,
          valor_unit: Number(it.valor_unit) || 0, subtotal: (Number(it.quantidade) || 0) * (Number(it.valor_unit) || 0), posicao: i,
        }))
        const ri = await sb.from('ordem_itens').insert(rows)
        if (ri.error) error = ri.error
      }
    }
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast(editando ? 'Ordem atualizada.' : 'Ordem criada.'); onSaved()
  }

  async function registrarPagamento() {
    if (!tenant || !ordem.id) return
    const v = Number((pagVal || '').replace(',', '.')) || saldo
    if (v <= 0) { toast('Informe um valor.', true); return }
    setPagBusy(true)
    const { error } = await sb.from('financeiro_lancamentos').insert({
      tenant_id: tenant.id, tipo: 'receita', ordem_id: ordem.id, cliente_id: ordem.cliente_id || null,
      descricao: `Pagamento OS #${ordem.numero}`, valor: v, pago: true, pago_em: hojeISO(),
    })
    if (!error) { try { await recomputeValorPago(ordem.id) } catch { /* não bloqueia */ } }
    setPagBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast('Pagamento registrado.'); onSaved()
  }

  return (
    <Modal title={editando ? `Ordem #${ordem.numero}` : 'Nova ordem'} onClose={onClose}>
      <Field label="Cliente">
        <select style={inp} value={f.cliente_id ?? ''} onChange={(e) => set('cliente_id', e.target.value || null)}>
          <option value="">— sem cliente —</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Descrição / referência da peça"><input style={inp} value={f.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Vestido de festa azul" /></Field>

      <div style={{ margin: '4px 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--plum)' }}>🧾 Itens do serviço</div>
      {itens.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)', marginBottom: 8 }}>Nenhum item. Adicione serviços do catálogo — o valor da ordem é somado automaticamente.</div>}
      {itens.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 88px 20px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input style={{ ...inp, padding: '7px 9px' }} value={it.descricao} onChange={(e) => updItem(i, { descricao: e.target.value })} placeholder="Descrição" />
          <input style={{ ...inp, padding: '7px 6px', textAlign: 'center' }} type="number" min="0" step="1" value={it.quantidade} onChange={(e) => updItem(i, { quantidade: Number(e.target.value) })} title="Qtd" />
          <input style={{ ...inp, padding: '7px 8px' }} type="number" min="0" step="0.01" value={it.valor_unit} onChange={(e) => updItem(i, { valor_unit: Number(e.target.value) })} title="Valor unitario" />
          <button onClick={() => rmItem(i)} aria-label="Remover item" style={{ border: 0, background: 'transparent', color: 'var(--danger)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
        <select style={{ ...inp, padding: '7px 9px', flex: '1 1 160px' }} value={addSel} onChange={(e) => { if (e.target.value) addServico(e.target.value) }}>
          <option value="">+ Adicionar serviço…</option>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome} — {BRL(s.preco_base)}</option>)}
        </select>
        <BtnSm onClick={addLivre}>+ item livre</BtnSm>
        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--plum)' }}>Total: {BRL(temItens ? total : (Number(f.valor) || 0))}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Field label="Status">
          <select style={inp} value={f.status ?? 'aberto'} onChange={(e) => set('status', e.target.value as OSStatus)}>
            {OS_STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </Field>
        {!temItens && <Field label="Valor (R$)"><input style={inp} type="number" min="0" step="0.01" value={f.valor ?? 0} onChange={(e) => set('valor', Number(e.target.value))} /></Field>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Entrada"><input style={inp} type="date" value={f.data_entrada ?? ''} onChange={(e) => set('data_entrada', e.target.value)} /></Field>
        <Field label="Prova"><input style={inp} type="date" value={f.data_prova ?? ''} onChange={(e) => set('data_prova', e.target.value)} /></Field>
        <Field label="Prazo"><input style={inp} type="date" value={f.prazo ?? ''} onChange={(e) => set('prazo', e.target.value)} /></Field>
      </div>
      <Field label="Observações"><input style={inp} value={f.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} /></Field>

      {editando && (
        <div style={{ marginTop: 4, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#faf7f9' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, marginBottom: saldo > 0 ? 9 : 0 }}>
            <span>Total: <b>{BRL(Number(ordem.valor) || 0)}</b></span>
            <span style={{ color: 'var(--ok)' }}>Pago: <b>{BRL(valorPago)}</b></span>
            <span style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--ok)' }}>Saldo: <b>{BRL(saldo)}</b></span>
          </div>
          {saldo > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input style={{ ...inp, padding: '7px 10px', width: 130 }} type="number" min="0" step="0.01" value={pagVal} onChange={(e) => setPagVal(e.target.value)} placeholder={saldo.toFixed(2)} />
              <button className="at-btn" style={{ width: 'auto', background: 'var(--ok)' }} disabled={pagBusy} onClick={() => void registrarPagamento()}>{pagBusy ? '…' : 'Registrar pagamento'}</button>
              <span style={{ fontSize: 12, color: 'var(--tx3)' }}>vazio = saldo total</span>
            </div>
          )}
        </div>
      )}
      <Foot>
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
