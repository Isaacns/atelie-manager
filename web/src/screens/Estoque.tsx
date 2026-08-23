import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb, type Produto, type MovTipo } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, BtnSm, Empty, ErroCarregar, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const baixo = (p: Produto) => (Number(p.quantidade) || 0) <= (Number(p.quantidade_minima) || 0)

export default function Estoque() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [lista, setLista] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [soBaixo, setSoBaixo] = useState(false)
  const [edit, setEdit] = useState<Partial<Produto> | null>(null)

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const { data, error } = await sb.from('estoque_produtos').select('*').eq('tenant_id', tenant.id).order('nome')
    if (error) { setErro(true); setLoading(false); return }
    setLista((data as Produto[]) ?? []); setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const nBaixo = useMemo(() => lista.filter(baixo).length, [lista])
  const visiveis = useMemo(() => {
    let l = soBaixo ? lista.filter(baixo) : lista
    const t = busca.trim().toLowerCase()
    if (t) l = l.filter((p) => p.nome.toLowerCase().includes(t) || (p.categoria ?? '').toLowerCase().includes(t) || (p.fornecedor ?? '').toLowerCase().includes(t))
    return l
  }, [lista, busca, soBaixo])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input style={{ ...inp, width: 'auto', flex: '1 1 220px', maxWidth: 320 }} placeholder="Buscar produto, categoria, fornecedor…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button onClick={() => setSoBaixo((s) => !s)} style={{ ...chip, ...(soBaixo ? chipOn : null) }}>Estoque baixo {nBaixo > 0 && <span style={{ opacity: .8 }}>({nBaixo})</span>}</button>
        <button className="at-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({})}>+ Novo produto</button>
      </div>
      <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : erro ? <ErroCarregar onRetry={() => void carregar()} /> : visiveis.length === 0 ? (
          <Empty ico="🧶" titulo="Estoque vazio" texto="Cadastre linhas, zíperes, botões, tecidos… com quantidade mínima para o sistema avisar quando estiver acabando.">
            <button className="at-btn" style={{ width: 'auto' }} onClick={() => setEdit({})}>Cadastrar produto</button>
          </Empty>
        ) : (
          <div className="at-tablewrap">
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Produto', 'Categoria', 'Estoque', 'Preço', ''].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
              <tbody>{visiveis.map((p) => { const low = baixo(p)
                return (
                  <tr key={p.id}>
                    <td style={td}><b>{p.nome}</b>{p.fornecedor ? <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{p.fornecedor}</div> : null}</td>
                    <td style={td}>{p.categoria || '—'}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontWeight: 700, color: low ? 'var(--danger)' : undefined }}>{Number(p.quantidade) || 0}</span> <span style={{ color: 'var(--tx3)', fontSize: 12 }}>{p.unidade}</span>
                      {low && <span title={`Mínimo ${p.quantidade_minima}`} style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: 'var(--danger)', background: '#dc26261e', borderRadius: 999, padding: '1px 8px' }}>baixo</span>}
                    </td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{BRL(p.preco)}</td>
                    <td style={{ ...td, textAlign: 'right' }}><BtnSm onClick={() => setEdit(p)}>Abrir</BtnSm></td>
                  </tr>
                ) })}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <EditarProduto produto={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void carregar() }} />}
    </div>
  )
}

function EditarProduto({ produto, onClose, onSaved }: { produto: Partial<Produto>; onClose: () => void; onSaved: () => void }) {
  const { tenant } = useAuth()
  const toast = useToast()
  const [f, setF] = useState<Partial<Produto>>({ unidade: 'un', quantidade: 0, quantidade_minima: 0, preco: 0, ...produto })
  const [busy, setBusy] = useState(false)
  const editando = !!produto.id
  const set = <K extends keyof Produto>(k: K, v: Produto[K]) => setF((s) => ({ ...s, [k]: v }))
  // movimento (só quando editando)
  const [movTipo, setMovTipo] = useState<MovTipo>('entrada')
  const [movQtd, setMovQtd] = useState('')
  const [movMot, setMovMot] = useState('')
  const [movBusy, setMovBusy] = useState(false)

  async function salvar() {
    if (!tenant) return
    if (!f.nome?.trim()) { toast('Nome é obrigatório.', true); return }
    if (!f.unidade?.trim()) { toast('Informe a unidade (un, m, cm, kg…).', true); return }
    setBusy(true)
    const dados = {
      tenant_id: tenant.id, nome: f.nome.trim(), categoria: f.categoria || null, unidade: f.unidade.trim(),
      quantidade_minima: Number(f.quantidade_minima) || 0, preco: Number(f.preco) || 0,
      fornecedor: f.fornecedor || null, localizacao: f.localizacao || null,
      ...(editando ? {} : { quantidade: Number(f.quantidade) || 0 }), // quantidade inicial só na criação
    }
    const { error } = editando ? await sb.from('estoque_produtos').update(dados).eq('id', produto.id!) : await sb.from('estoque_produtos').insert(dados)
    setBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast('Produto salvo.'); onSaved()
  }

  async function aplicarMov() {
    if (!tenant || !produto.id) return
    const q = Number((movQtd || '').replace(',', '.'))
    if (!(q > 0)) { toast('Informe a quantidade do movimento.', true); return }
    setMovBusy(true)
    const { error } = await sb.from('estoque_movimentos').insert({
      tenant_id: tenant.id, produto_id: produto.id, tipo: movTipo, quantidade: q, motivo: movMot || null,
    })
    setMovBusy(false)
    if (error) { toast(errMsg(error), true); return }
    toast('Movimento aplicado.'); onSaved() // o trigger atualiza a quantidade
  }

  return (
    <Modal title={editando ? 'Produto' : 'Novo produto'} onClose={onClose}>
      <Field label="Nome *"><input style={inp} value={f.nome ?? ''} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Linha preta, zíper 40cm…" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Categoria"><input style={inp} value={f.categoria ?? ''} onChange={(e) => set('categoria', e.target.value)} placeholder="Aviamentos, tecidos…" /></Field>
        <Field label="Unidade *"><input style={inp} value={f.unidade ?? ''} onChange={(e) => set('unidade', e.target.value)} placeholder="un, m, cm, kg" /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: editando ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
        {!editando && <Field label="Qtd. inicial"><input style={inp} type="number" min="0" step="0.01" value={f.quantidade ?? 0} onChange={(e) => set('quantidade', Number(e.target.value))} /></Field>}
        <Field label="Estoque mínimo"><input style={inp} type="number" min="0" step="0.01" value={f.quantidade_minima ?? 0} onChange={(e) => set('quantidade_minima', Number(e.target.value))} /></Field>
        <Field label="Preço (R$)"><input style={inp} type="number" min="0" step="0.01" value={f.preco ?? 0} onChange={(e) => set('preco', Number(e.target.value))} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Fornecedor"><input style={inp} value={f.fornecedor ?? ''} onChange={(e) => set('fornecedor', e.target.value)} /></Field>
        <Field label="Localização"><input style={inp} value={f.localizacao ?? ''} onChange={(e) => set('localizacao', e.target.value)} placeholder="Gaveta, prateleira…" /></Field>
      </div>

      {editando && (
        <div style={{ marginTop: 4, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#faf7f9' }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Em estoque: <b>{Number(produto.quantidade) || 0} {produto.unidade}</b> <span style={{ color: 'var(--tx3)' }}>· mín. {produto.quantidade_minima}</span></div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={{ ...inp, padding: '7px 9px', width: 'auto' }} value={movTipo} onChange={(e) => setMovTipo(e.target.value as MovTipo)}>
              <option value="entrada">Entrada (+)</option>
              <option value="saida">Saída (−)</option>
              <option value="ajuste">Ajuste (=)</option>
            </select>
            <input style={{ ...inp, padding: '7px 9px', width: 90 }} type="number" min="0" step="0.01" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} placeholder="Qtd" />
            <input style={{ ...inp, padding: '7px 9px', flex: '1 1 120px' }} value={movMot} onChange={(e) => setMovMot(e.target.value)} placeholder="Motivo (opcional)" />
            <button className="at-btn" style={{ width: 'auto' }} disabled={movBusy} onClick={() => void aplicarMov()}>{movBusy ? '…' : 'Aplicar'}</button>
          </div>
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
const chipOn: CSSProperties = { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }
const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
