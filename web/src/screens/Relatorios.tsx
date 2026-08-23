import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { sb, OS_STATUS, type OSStatus } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { ErroCarregar, Loading } from '../ui/kit'

// Relatórios — réplica do módulo vanilla (index.html ~l.2083).
// KPIs + painéis (stat-list, aqui como barras div) + 3 relatórios de impressão/PDF.
// Sem lib de gráfico: barras horizontais no padrão do Dashboard ("Recebido — últimos 6 meses").
const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const iso = (d: Date) => d.toISOString().slice(0, 10)
const todayISO = () => iso(new Date())
const monthStart = () => { const d = new Date(); d.setDate(1); return iso(d) }
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
const fmtDate = (s: string) => { const p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (s || '') }
const esc = (s: unknown) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

interface Os {
  numero: number
  cliente_id: string | null
  status: OSStatus
  descricao: string | null
  valor: number
  data_entrada: string
  entregue_em: string | null
}
interface Lanc { tipo: 'receita' | 'despesa'; valor: number; pago: boolean; pago_em: string | null; vencimento: string | null; descricao: string | null }

export default function Relatorios() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [ordens, setOrdens] = useState<Os[]>([])
  const [nomeCli, setNomeCli] = useState<Map<string, string>>(new Map())
  const [fin, setFin] = useState<Lanc[]>([])
  const [ini, setIni] = useState(monthStart())
  const [fim, setFim] = useState(todayISO())

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const [rOs, rCli, rFin] = await Promise.all([
      sb.from('ordens').select('numero, cliente_id, status, descricao, valor, data_entrada, entregue_em').eq('tenant_id', tenant.id),
      sb.from('clientes').select('id, nome').eq('tenant_id', tenant.id),
      sb.from('financeiro_lancamentos').select('tipo, valor, pago, pago_em, vencimento, descricao').eq('tenant_id', tenant.id),
    ])
    if (rOs.error || rCli.error || rFin.error) { setErro(true); setLoading(false); return }
    setOrdens((rOs.data as Os[]) ?? [])
    setNomeCli(new Map(((rCli.data as { id: string; nome: string }[]) ?? []).map((c) => [c.id, c.nome])))
    setFin((rFin.data as Lanc[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const cn = (id: string | null) => (id ? (nomeCli.get(id) ?? '—') : '—')

  // Filtragem por período é client-side (mesma regra do vanilla) e instantânea — recalcula ao mudar as datas.
  const d = useMemo(() => {
    const per = ordens.filter((o) => o.data_entrada >= ini && o.data_entrada <= fim)
    const receita = per.reduce((a, o) => a + Number(o.valor || 0), 0)
    const qtd = per.length

    const porStatus = OS_STATUS
      .map((s) => ({ v: s.v, label: s.label, cor: s.cor, c: per.filter((o) => o.status === s.v).length }))
      .filter((x) => x.c > 0)

    const servMap: Record<string, { c: number; v: number }> = {}
    per.forEach((o) => { const k = (o.descricao || 'Sem descrição').trim(); const m = servMap[k] || (servMap[k] = { c: 0, v: 0 }); m.c++; m.v += Number(o.valor || 0) })
    const topServ = Object.entries(servMap).map(([nome, m]) => ({ nome, c: m.c, v: m.v })).sort((a, b) => b.c - a.c).slice(0, 8)

    // Clientes mais frequentes: histórico total (como no vanilla), não só o período.
    const cliMap: Record<string, number> = {}
    ordens.forEach((o) => { if (!o.cliente_id) return; cliMap[o.cliente_id] = (cliMap[o.cliente_id] || 0) + 1 })
    const topCli = Object.entries(cliMap).map(([id, c]) => ({ nome: cn(id), c })).sort((a, b) => b.c - a.c).slice(0, 8)

    const durs = per.filter((o) => o.entregue_em && o.data_entrada).map((o) => daysBetween(o.data_entrada, (o.entregue_em as string).slice(0, 10))).filter((x) => x >= 0)
    const tempoMedio = durs.length ? (durs.reduce((a, b) => a + b, 0) / durs.length).toFixed(1) : null

    // Faturamento do período (a partir do financeiro) — mesma regra do relatório impresso.
    const inR = (l: Lanc) => { const dd = l.pago_em || l.vencimento || ''; return dd >= ini && dd <= fim }
    const rec = fin.filter((l) => l.tipo === 'receita' && l.pago && inR(l))
    const desp = fin.filter((l) => l.tipo === 'despesa' && l.pago && inR(l))
    const recebido = rec.reduce((s, l) => s + Number(l.valor || 0), 0)
    const pago = desp.reduce((s, l) => s + Number(l.valor || 0), 0)

    return { per, receita, qtd, porStatus, topServ, topCli, tempoMedio, ticket: qtd ? receita / qtd : 0, rec, recebido, pago, saldo: recebido - pago }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordens, fin, nomeCli, ini, fim])

  const periodo = `${fmtDate(ini)} a ${fmtDate(fim)}`

  function printEntradas() {
    const rows = d.per.slice().sort((a, b) => a.data_entrada.localeCompare(b.data_entrada))
    const tot = rows.reduce((s, o) => s + Number(o.valor || 0), 0)
    const body = `<div class="kv"><span>Período: <b>${esc(periodo)}</b></span><span>Serviços: <b>${rows.length}</b></span></div>`
      + '<table><thead><tr><th>#</th><th>Cliente</th><th>Serviço</th><th>Entrada</th><th class="r">Valor</th></tr></thead><tbody>'
      + rows.map((o) => `<tr><td>${o.numero}</td><td>${esc(cn(o.cliente_id))}</td><td>${esc(o.descricao || '—')}</td><td>${fmtDate(o.data_entrada)}</td><td class="r">${BRL(o.valor)}</td></tr>`).join('')
      + `</tbody><tfoot><tr><td colspan="4">Total de entradas</td><td class="r">${BRL(tot)}</td></tr></tfoot></table>`
    printDoc('Relatório de Entradas — ' + periodo, body, tenant?.nome)
  }
  function printFinalizados() {
    const rows = d.per.filter((o) => o.status === 'finalizado' || o.status === 'entregue').sort((a, b) => (a.entregue_em || '').localeCompare(b.entregue_em || ''))
    const tot = rows.reduce((s, o) => s + Number(o.valor || 0), 0)
    const body = `<div class="kv"><span>Período: <b>${esc(periodo)}</b></span><span>Finalizados: <b>${rows.length}</b></span><span>Tempo médio: <b>${d.tempoMedio ?? '—'} dias</b></span></div>`
      + '<table><thead><tr><th>#</th><th>Cliente</th><th>Serviço</th><th>Entrega</th><th class="r">Valor</th></tr></thead><tbody>'
      + rows.map((o) => `<tr><td>${o.numero}</td><td>${esc(cn(o.cliente_id))}</td><td>${esc(o.descricao || '—')}</td><td>${o.entregue_em ? fmtDate(o.entregue_em.slice(0, 10)) : '—'}</td><td class="r">${BRL(o.valor)}</td></tr>`).join('')
      + `</tbody><tfoot><tr><td colspan="4">Total finalizado</td><td class="r">${BRL(tot)}</td></tr></tfoot></table>`
    printDoc('Relatório de Finalizados — ' + periodo, body, tenant?.nome)
  }
  function printFaturamento() {
    const osTot = d.per.reduce((s, o) => s + Number(o.valor || 0), 0)
    const body = `<div class="kv"><span>Período: <b>${esc(periodo)}</b></span></div>`
      + '<table><tbody>'
      + `<tr><td>Serviços registrados no período</td><td class="r">${BRL(osTot)}</td></tr>`
      + `<tr><td>Receitas recebidas</td><td class="r">${BRL(d.recebido)}</td></tr>`
      + `<tr><td>Despesas pagas</td><td class="r">− ${BRL(d.pago)}</td></tr>`
      + `</tbody><tfoot><tr><td>Saldo do período</td><td class="r">${BRL(d.saldo)}</td></tr></tfoot></table>`
      + (d.rec.length ? ('<h3>Receitas recebidas</h3><table><thead><tr><th>Descrição</th><th>Data</th><th class="r">Valor</th></tr></thead><tbody>'
        + d.rec.map((l) => `<tr><td>${esc(l.descricao || '—')}</td><td>${fmtDate(l.pago_em || l.vencimento || '')}</td><td class="r">${BRL(l.valor)}</td></tr>`).join('') + '</tbody></table>') : '')
    printDoc('Relatório de Faturamento — ' + periodo, body, tenant?.nome)
  }

  if (loading) return <Loading />
  if (erro) return <div className="at-card" style={{ padding: 0 }}><ErroCarregar onRetry={() => void carregar()} /></div>

  const maxServ = Math.max(1, ...d.topServ.map((s) => s.c))
  const maxCli = Math.max(1, ...d.topCli.map((c) => c.c))
  const maxSt = Math.max(1, ...d.porStatus.map((s) => s.c))

  return (
    <div>
      <div style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 14 }}>Indicadores do período e relatórios prontos para impressão / PDF.</div>

      <div className="at-card" style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', marginBottom: 16 }}>
        <label style={{ display: 'block' }}>
          <span style={rotulo}>De</span>
          <input type="date" value={ini} max={fim} onChange={(e) => setIni(e.target.value)} style={dateInp} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={rotulo}>Até</span>
          <input type="date" value={fim} min={ini} onChange={(e) => setFim(e.target.value)} style={dateInp} />
        </label>
        <span style={{ fontSize: 12, color: 'var(--tx3)', paddingBottom: 6 }}>{periodo}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Serviços no período" valor={String(d.qtd)} cor="var(--plum)" />
        <Kpi label="Valor no período" valor={BRL(d.receita)} cor="var(--ok)" />
        <Kpi label="Tempo médio (dias)" valor={d.tempoMedio ?? '—'} cor="var(--purple)" />
        <Kpi label="Ticket médio" valor={BRL(d.ticket)} cor="var(--tx2)" />
      </div>

      <div className="at-card" style={{ padding: '16px 18px', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 2px' }}>Gerenciador de relatórios</h2>
        <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px' }}>Emita cada relatório individualmente — abre uma versão pronta para impressão / PDF.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <BtnRel onClick={printEntradas}>Entradas do período</BtnRel>
          <BtnRel onClick={printFinalizados}>Finalizados</BtnRel>
          <BtnRel onClick={printFaturamento}>Faturamento</BtnRel>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 16 }}>
        <div className="at-card" style={{ padding: '16px 18px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 2px' }}>Serviços mais solicitados</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px' }}>No período selecionado.</p>
          {d.topServ.length === 0 ? <Vazio /> : d.topServ.map((s) => (
            <BarRow key={s.nome} label={s.nome} frac={s.c / maxServ} valor={`${s.c}×`} extra={BRL(s.v)} />
          ))}
        </div>
        <div className="at-card" style={{ padding: '16px 18px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 2px' }}>Clientes mais frequentes</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px' }}>Total histórico de serviços.</p>
          {d.topCli.length === 0 ? <Vazio /> : d.topCli.map((c, i) => (
            <BarRow key={c.nome + i} label={c.nome} frac={c.c / maxCli} valor={`${c.c}×`} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        <div className="at-card" style={{ padding: '16px 18px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 2px' }}>Distribuição por status</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px' }}>Ordens do período por situação.</p>
          {d.porStatus.length === 0 ? <Vazio /> : d.porStatus.map((s) => (
            <BarRow key={s.v} label={s.label} frac={s.c / maxSt} valor={String(s.c)} cor={s.cor} />
          ))}
        </div>
        <div className="at-card" style={{ padding: '16px 18px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 2px' }}>Faturamento do período</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px' }}>Receitas recebidas × despesas pagas (Financeiro).</p>
          <LinhaFat label="Receitas recebidas" valor={BRL(d.recebido)} cor="var(--ok)" />
          <LinhaFat label="Despesas pagas" valor={'− ' + BRL(d.pago)} cor="var(--danger)" />
          <div style={{ borderTop: '2px solid var(--line)', marginTop: 8, paddingTop: 10 }}>
            <LinhaFat label="Saldo do período" valor={BRL(d.saldo)} cor={d.saldo >= 0 ? 'var(--ok)' : 'var(--danger)'} forte />
          </div>
        </div>
      </div>
    </div>
  )
}

function BarRow({ label, frac, valor, extra, cor }: { label: string; frac: number; valor: string; extra?: string; cor?: string }) {
  const barBg = cor ?? undefined
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--plum)', whiteSpace: 'nowrap' }}>
          {extra && <span style={{ fontWeight: 500, color: 'var(--tx3)', marginRight: 8 }}>{extra}</span>}{valor}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: '#f2ecf0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(3, frac * 100)}%`, borderRadius: 999, background: barBg ?? 'linear-gradient(90deg,var(--plum),var(--purple))', transition: 'width .5s' }} />
      </div>
    </div>
  )
}

function LinhaFat({ label, valor, cor, forte }: { label: string; valor: string; cor: string; forte?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0' }}>
      <span style={{ fontSize: forte ? 15 : 14, color: 'var(--tx2)', fontWeight: forte ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: forte ? 19 : 16, fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
    </div>
  )
}

function Vazio() { return <div style={{ color: 'var(--tx3)', fontSize: 14, padding: '6px 0' }}>Sem dados no período.</div> }

function Kpi({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="at-card" style={{ padding: '14px 16px', border: '1px solid var(--line)', background: '#fff' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--tx3)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: cor, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </div>
  )
}

function BtnRel({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ border: '1px solid var(--line)', background: '#fff', color: 'var(--plum)', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer', font: 'inherit' }}>🖨️ {children}</button>
}

// Abre uma janela com o relatório branded pronto para imprimir / salvar em PDF.
// Sem logo hardcoded (white-label): cabeçalho usa só o nome do tenant.
function printDoc(title: string, bodyHtml: string, tenantName?: string) {
  const w = window.open('', '_blank', 'width=900,height=760')
  if (!w) { alert('Permita pop-ups para gerar a impressão.'); return }
  const css = '@page{margin:0}*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#2e2b31;margin:0;padding:18mm 16mm}'
    + '.brand{border-bottom:2px solid #5e3a56;padding-bottom:12px;margin-bottom:18px;display:flex;align-items:flex-end}'
    + '.brand h1{font-family:Georgia,serif;color:#2e2b31;font-size:20px;margin:0}.brand .s{color:#8a7e86;font-size:12px}'
    + '.brand .meta{margin-left:auto;text-align:right;color:#8a7e86;font-size:11px}'
    + 'table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:4px}th{text-align:left;color:#8a7e86;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;border-bottom:1px solid #e7ddd0;padding:6px 8px}'
    + 'td{padding:7px 8px;border-bottom:1px solid #f0e9df}.r{text-align:right}tfoot td{font-weight:700;border-top:2px solid #5e3a56;color:#5e3a56}h3{color:#5e3a56;font-size:14px;margin:16px 0 4px}'
    + '.kv{display:flex;gap:22px;margin:8px 0 4px;font-size:12px}.kv b{color:#5e3a56}.ft{margin-top:26px;color:#b6a9b1;font-size:10px;text-align:center}'
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + css + '</style></head><body>'
    + '<div class="brand"><div><h1>' + esc(tenantName || 'Ateliê') + '</h1><div class="s">Ateliê de costura</div></div>'
    + '<div class="meta">' + esc(title) + '<br>Emitido em ' + new Date().toLocaleString('pt-BR') + '</div></div>'
    + bodyHtml + '<div class="ft">Ateliê Manager By Vizio</div>'
    + '<' + 'script>window.onload=function(){setTimeout(function(){window.print()},150)}<' + '/script></body></html>')
  w.document.close()
}

const rotulo: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }
const dateInp: CSSProperties = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 15, background: '#fff', color: 'var(--ink)', font: 'inherit' }
