import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BtnGhost, Field, Foot, Loading, Modal, errMsg, inp, useToast } from '../ui/kit'

// Agenda — kanban semanal Seg–Sáb × Manhã/Tarde/Noite sobre atelie.agenda_atividades.
// Réplica do módulo vanilla (index.html ~l.2475). Arrastar NUNCA é o único caminho:
// cada cartão tem botões de período; o formulário também permite trocar dia/período.
type Periodo = 'manha' | 'tarde' | 'noite'
type Status = 'pendente' | 'concluida'
interface Atividade {
  id: string
  tenant_id: string
  dia: string        // YYYY-MM-DD
  periodo: Periodo
  titulo: string
  observacoes: string | null
  status: Status
  ordem: number
  created_at?: string
}

const PERIODOS: { id: Periodo; label: string; ic: string }[] = [
  { id: 'manha', label: 'Manhã', ic: '🌅' },
  { id: 'tarde', label: 'Tarde', ic: '☀️' },
  { id: 'noite', label: 'Noite', ic: '🌙' },
]
const NOMES_DIA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const periodoAtual = (): Periodo => { const h = new Date().getHours(); return h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite' }
const nomePer = (p: Periodo) => PERIODOS.find((x) => x.id === p)?.label ?? '—'
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const segundaDe = (d: Date) => { const x = new Date(d); const w = x.getDay(); x.setDate(x.getDate() + (w === 0 ? -6 : 1 - w)); x.setHours(0, 0, 0, 0); return x }
const dd = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

interface Rascunho { id?: string; dia: string; periodo: Periodo; titulo: string; observacoes: string }

export default function Agenda() {
  const { tenant } = useAuth()
  const toast = useToast()
  const [semana, setSemana] = useState(0)
  const [rows, setRows] = useState<Atividade[] | null>(null)
  const [edit, setEdit] = useState<Rascunho | null>(null)
  const [del, setDel] = useState<Atividade | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<string | null>(null)

  const dias = useMemo(() => {
    const seg = segundaDe(new Date()); seg.setDate(seg.getDate() + semana * 7)
    return NOMES_DIA.map((nome, i) => { const d = new Date(seg); d.setDate(seg.getDate() + i); return { nome, data: d, ymd: ymd(d) } })
  }, [semana])
  const hojeYmd = ymd(new Date()), perAtual = periodoAtual()

  const carregar = useCallback(async () => {
    if (!tenant) return
    const { data, error } = await sb.from('agenda_atividades').select('*')
      .eq('tenant_id', tenant.id)
      .gte('dia', dias[0].ymd).lte('dia', dias[dias.length - 1].ymd)
      .order('ordem', { ascending: true }).order('created_at', { ascending: true })
    if (error) { setRows([]); toast(errMsg(error), true); return }
    setRows((data as Atividade[]) ?? [])
  }, [tenant, dias, toast])
  useEffect(() => { void carregar() }, [carregar])

  // move = alterar dia e/ou período (usado pelo arrasto E pelos botões, por acessibilidade).
  async function mover(at: Atividade, novoDia: string, novoPer: Periodo) {
    if (at.dia === novoDia && at.periodo === novoPer) return
    setRows((rs) => (rs ?? []).map((r) => (r.id === at.id ? { ...r, dia: novoDia, periodo: novoPer } : r)))
    const { error } = await sb.from('agenda_atividades').update({ dia: novoDia, periodo: novoPer }).eq('id', at.id)
    if (error) { toast('Não consegui mover a atividade. ' + errMsg(error), true); void carregar() }
  }
  async function alternarFeito(at: Atividade) {
    const novo: Status = at.status === 'concluida' ? 'pendente' : 'concluida'
    setRows((rs) => (rs ?? []).map((r) => (r.id === at.id ? { ...r, status: novo } : r)))
    const { error } = await sb.from('agenda_atividades').update({ status: novo }).eq('id', at.id)
    if (error) { toast('Não consegui atualizar. ' + errMsg(error), true); void carregar() }
  }
  async function salvar(f: Rascunho): Promise<boolean> {
    if (!tenant) return false
    const titulo = (f.titulo || '').trim()
    if (!titulo) { toast('Escreva o que precisa ser feito.', true); return false }
    const payload = { titulo, observacoes: f.observacoes || null, dia: f.dia, periodo: f.periodo }
    const { error } = f.id
      ? await sb.from('agenda_atividades').update(payload).eq('id', f.id)
      : await sb.from('agenda_atividades').insert({ ...payload, tenant_id: tenant.id })
    if (error) { toast('Erro ao salvar: ' + errMsg(error), true); return false }
    toast(f.id ? 'Atividade atualizada.' : 'Atividade criada.'); void carregar(); return true
  }
  async function excluir(at: Atividade) {
    const { error } = await sb.from('agenda_atividades').delete().eq('id', at.id)
    if (error) toast('Erro ao excluir: ' + errMsg(error), true)
    else { toast('Atividade removida.'); void carregar() }
  }

  const rotulo = dias.length ? `${dd(dias[0].data)} a ${dd(dias[5].data)}` : ''
  const total = (rows ?? []).length, feitas = (rows ?? []).filter((r) => r.status === 'concluida').length

  return (
    <div>
      <div className="at-card" style={{ padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
        <span>⏰ Agora é <b>{nomePer(perAtual)}</b> — foque nas atividades deste período.</span>
        <span style={{ marginLeft: 'auto', color: 'var(--tx3)' }}>{total} atividade{total === 1 ? '' : 's'} na semana{total ? ` · ${feitas} concluída${feitas === 1 ? '' : 's'}` : ''}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <button style={navBtn} onClick={() => setSemana((s) => s - 1)} title="Semana anterior">‹</button>
        <button style={navBtn} onClick={() => setSemana(0)}>Hoje</button>
        <button style={navBtn} onClick={() => setSemana((s) => s + 1)} title="Próxima semana">›</button>
        <span style={{ color: 'var(--tx2)', fontSize: 13 }}>Semana de {rotulo}</span>
        <button className="at-btn" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setEdit({ dia: hojeYmd, periodo: perAtual, titulo: '', observacoes: '' })}>+ Nova atividade</button>
      </div>

      {rows === null ? <Loading /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'start' }}>
          {dias.map((d) => {
            const ehHoje = d.ymd === hojeYmd
            return (
              <div key={d.ymd} className="at-card" style={{ padding: 0, overflow: 'hidden', border: ehHoje ? '1px solid var(--plum)' : '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 11px', background: ehHoje ? 'linear-gradient(135deg,var(--plum),var(--purple))' : '#f7f3f6', color: ehHoje ? '#fff' : 'var(--ink)' }}>
                  <b style={{ fontSize: 13 }}>{d.nome}</b>
                  <span style={{ fontSize: 12, opacity: .8 }}>{dd(d.data)}</span>
                  <button title={'Nova atividade em ' + d.nome} onClick={() => setEdit({ dia: d.ymd, periodo: perAtual, titulo: '', observacoes: '' })}
                    style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'inherit', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>+</button>
                </div>
                {PERIODOS.map((p) => {
                  const itens = (rows ?? []).filter((r) => r.dia === d.ymd && r.periodo === p.id)
                  const chave = d.ymd + '|' + p.id, ehAgora = ehHoje && p.id === perAtual, realce = alvo === chave
                  return (
                    <div key={p.id}
                      onDragOver={(e) => { e.preventDefault(); if (alvo !== chave) setAlvo(chave) }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node) && alvo === chave) setAlvo(null) }}
                      onDrop={(e) => { e.preventDefault(); setAlvo(null); const id = arrastando; if (!id) return; const at = (rows ?? []).find((r) => r.id === id); if (at) void mover(at, d.ymd, p.id) }}
                      style={{ borderTop: '1px solid var(--line)', padding: '7px 8px', background: realce ? '#efe6ef' : ehAgora ? '#faf6fb' : '#fff', transition: 'background .15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 5 }}>
                        <span>{p.ic} {p.label}</span>
                        {ehAgora && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--plum)', background: '#5e3a561e', borderRadius: 999, padding: '1px 6px' }}>agora</span>}
                        <span style={{ marginLeft: 'auto' }}>{itens.length}</span>
                      </div>
                      {itens.length === 0 ? <div style={{ color: 'var(--line)', fontSize: 12, padding: '2px 0 4px' }}>—</div> : itens.map((at) => (
                        <div key={at.id} draggable
                          onDragStart={() => setArrastando(at.id)}
                          onDragEnd={() => { setArrastando(null); setAlvo(null) }}
                          style={{ border: '1px solid var(--line)', borderRadius: 9, padding: '7px 9px', marginBottom: 6, background: '#fff', opacity: arrastando === at.id ? .5 : 1, cursor: 'grab' }}>
                          <div onClick={() => setEdit({ id: at.id, dia: at.dia, periodo: at.periodo, titulo: at.titulo, observacoes: at.observacoes ?? '' })}
                            title="Clique para editar"
                            style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: at.status === 'concluida' ? 'line-through' : 'none', color: at.status === 'concluida' ? 'var(--tx3)' : 'var(--ink)' }}>{at.titulo}</div>
                          {at.observacoes && <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>{at.observacoes}</div>}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                            <button style={miniBtn} onClick={() => void alternarFeito(at)} title={at.status === 'concluida' ? 'Reabrir' : 'Marcar como concluída'}>{at.status === 'concluida' ? '↩' : '✓'}</button>
                            {PERIODOS.filter((q) => q.id !== at.periodo).map((q) => (
                              <button key={q.id} style={miniBtn} title={'Mover para ' + q.label} onClick={() => void mover(at, at.dia, q.id)}>{q.label.slice(0, 1)}</button>
                            ))}
                            <button style={{ ...miniBtn, color: 'var(--danger)' }} title="Excluir" onClick={() => setDel(at)}>🗑</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {edit && <AgendaForm rascunho={edit} dias={dias} onClose={() => setEdit(null)} onSave={salvar} />}
      {del && (
        <Modal title="Excluir atividade" onClose={() => setDel(null)}>
          <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 4 }}>Excluir <b>“{del.titulo}”</b>? Esta ação não pode ser desfeita.</p>
          <Foot>
            <BtnGhost onClick={() => setDel(null)}>Cancelar</BtnGhost>
            <button className="at-btn" style={{ width: 'auto', background: 'var(--danger)' }} onClick={() => { const a = del; setDel(null); void excluir(a) }}>Excluir</button>
          </Foot>
        </Modal>
      )}
    </div>
  )
}

function AgendaForm({ rascunho, dias, onClose, onSave }: { rascunho: Rascunho; dias: { nome: string; data: Date; ymd: string }[]; onClose: () => void; onSave: (f: Rascunho) => Promise<boolean> }) {
  const [f, setF] = useState<Rascunho>({ ...rascunho })
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setF((o) => ({ ...o, [k]: v }))
  return (
    <Modal title={f.id ? 'Editar atividade' : 'Nova atividade'} onClose={onClose}>
      <Field label="O que precisa ser feito *"><input style={inp} autoFocus value={f.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Cortar o vestido da Roberta" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Dia">
          <select style={inp} value={f.dia} onChange={(e) => set('dia', e.target.value)}>
            {dias.map((d) => <option key={d.ymd} value={d.ymd}>{d.nome} · {dd(d.data)}</option>)}
          </select>
        </Field>
        <Field label="Período">
          <select style={inp} value={f.periodo} onChange={(e) => set('periodo', e.target.value as Periodo)}>
            {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Observações"><textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={f.observacoes} onChange={(e) => set('observacoes', e.target.value)} placeholder="Opcional" /></Field>
      <Foot>
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <button className="at-btn" style={{ width: 'auto' }} disabled={busy} onClick={async () => { setBusy(true); const ok = await onSave(f); setBusy(false); if (ok) onClose() }}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </Foot>
    </Modal>
  )
}

const navBtn: CSSProperties = { border: '1px solid var(--line)', background: '#fff', color: 'var(--plum)', borderRadius: 8, padding: '5px 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }
const miniBtn: CSSProperties = { border: '1px solid var(--line)', background: '#fff', color: 'var(--tx2)', borderRadius: 6, padding: '3px 7px', fontSize: 12, fontWeight: 600, cursor: 'pointer', lineHeight: 1 }
