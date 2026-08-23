import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb, OS_STATUS, type Ordem, type OSStatus, type Lancamento } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { ErroCarregar, Loading } from '../ui/kit'

const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const BRLk = (n: number) => (Number(n) || 0) >= 1000 ? 'R$ ' + (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k' : BRL(n)
const ABERTAS: OSStatus[] = ['orcamento', 'aberto', 'em_andamento', 'costurando', 'aguardando_prova', 'aguardando_retirada']
const stInfo = (v: OSStatus) => OS_STATUS.find((s) => s.v === v) ?? { v, label: v, cor: '#8a7e86' }
const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const iso = (d: Date) => d.toISOString().slice(0, 10)
const fmtDia = (s: string) => { const p = s.slice(0, 10).split('-'); return `${p[2]}/${p[1]}` }

export default function Dashboard({ onGo }: { onGo?: (tab: 'ordens') => void }) {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [nClientes, setNClientes] = useState(0)
  const [nomeCli, setNomeCli] = useState<Map<string, string>>(new Map())
  const [receitas, setReceitas] = useState<Lancamento[]>([])

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const [o, c, r] = await Promise.all([
      sb.from('ordens').select('id, numero, cliente_id, status, descricao, valor, valor_pago, data_entrada, prazo, data_prova, atrasado, observacoes').eq('tenant_id', tenant.id).order('numero', { ascending: false }),
      sb.from('clientes').select('id, nome').eq('tenant_id', tenant.id),
      sb.from('financeiro_lancamentos').select('*').eq('tenant_id', tenant.id).eq('tipo', 'receita').eq('pago', true),
    ])
    if (o.error) { setErro(true); setLoading(false); return }
    setOrdens((o.data as Ordem[]) ?? [])
    const cli = (c.data as { id: string; nome: string }[]) ?? []
    setNClientes(cli.length)
    setNomeCli(new Map(cli.map((x) => [x.id, x.nome])))
    setReceitas((r.data as Lancamento[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const k = useMemo(() => {
    const hoje = iso(new Date())
    const abertas = ordens.filter((o) => ABERTAS.includes(o.status))
    const atrasadas = abertas.filter((o) => o.atrasado || (o.prazo && o.prazo < hoje))
    const ini = new Date(); ini.setDate(1); const iniMes = iso(ini)
    const recMes = receitas.filter((x) => (x.pago_em ?? '') >= iniMes).reduce((s, x) => s + (Number(x.valor) || 0), 0)
    // agenda próximos 7 dias
    const lim = new Date(); lim.setDate(lim.getDate() + 7); const limISO = iso(lim)
    const agenda: { id: string; numero: number; data: string; tipo: string; cliente: string; desc: string }[] = []
    abertas.forEach((o) => {
      const cli = o.cliente_id ? (nomeCli.get(o.cliente_id) ?? '—') : '—'
      if (o.data_prova && o.data_prova >= hoje && o.data_prova <= limISO) agenda.push({ id: o.id, numero: o.numero, data: o.data_prova, tipo: 'Prova', cliente: cli, desc: o.descricao ?? '' })
      if (o.prazo && o.prazo >= hoje && o.prazo <= limISO) agenda.push({ id: o.id, numero: o.numero, data: o.prazo, tipo: 'Entrega', cliente: cli, desc: o.descricao ?? '' })
    })
    agenda.sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0)
    // recebido por mês (últimos 6)
    const meses: { key: string; label: string; val: number }[] = []
    const base = new Date(); base.setDate(1)
    for (let i = 5; i >= 0; i--) { const d = new Date(base.getFullYear(), base.getMonth() - i, 1); meses.push({ key: iso(d).slice(0, 7), label: MES3[d.getMonth()], val: 0 }) }
    receitas.forEach((x) => { const mk = (x.pago_em ?? '').slice(0, 7); const m = meses.find((mm) => mm.key === mk); if (m) m.val += Number(x.valor) || 0 })
    const maxMes = Math.max(1, ...meses.map((m) => m.val))
    return { nAbertas: abertas.length, nAtrasadas: atrasadas.length, recMes, agenda, meses, maxMes, recentes: ordens.slice(0, 6) }
  }, [ordens, receitas, nomeCli])

  if (loading) return <Loading />
  if (erro) return <div className="at-card" style={{ padding: 0 }}><ErroCarregar onRetry={() => void carregar()} /></div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <Kpi label="Ordens em aberto" valor={String(k.nAbertas)} cor="var(--plum)" onClick={onGo ? () => onGo('ordens') : undefined} />
        <Kpi label="Atrasadas" valor={String(k.nAtrasadas)} cor="var(--danger)" onClick={onGo ? () => onGo('ordens') : undefined} />
        <Kpi label="Clientes" valor={String(nClientes)} cor="var(--purple)" />
        <Kpi label="Recebido no mês" valor={BRLk(k.recMes)} cor="var(--ok)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 14 }}>
        <div className="at-card" style={{ padding: '16px 18px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 2px' }}>Agenda dos próximos 7 dias</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px' }}>Provas marcadas e entregas previstas.</p>
          {k.agenda.length === 0 ? <div style={{ color: 'var(--tx3)', fontSize: 14, padding: '8px 0' }}>Nada agendado para os próximos dias.</div> : (
            <div className="at-tablewrap">
              <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>{k.agenda.map((a, i) => { const hj = a.data === iso(new Date())
                  return (
                    <tr key={a.id + a.tipo + i}>
                      <td style={{ ...tdc, whiteSpace: 'nowrap' }}><b style={{ color: hj ? 'var(--danger)' : undefined }}>{hj ? 'Hoje' : fmtDia(a.data)}</b></td>
                      <td style={tdc}><span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 999, color: a.tipo === 'Prova' ? '#2f8f8f' : 'var(--plum)', background: (a.tipo === 'Prova' ? '#2f8f8f' : '#5e3a56') + '1e' }}>{a.tipo}</span></td>
                      <td style={tdc}>{a.cliente}<div style={{ fontSize: 12, color: 'var(--tx3)' }}>{a.desc.slice(0, 34)}</div></td>
                      <td style={{ ...tdc, textAlign: 'right', color: 'var(--tx3)' }}>#{a.numero}</td>
                    </tr>
                  ) })}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="at-card" style={{ padding: '16px 18px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 2px' }}>Recebido — últimos 6 meses</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 14px' }}>Receitas quitadas por mês.</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
            {k.meses.map((m) => (
              <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 600 }}>{m.val > 0 ? BRLk(m.val) : ''}</div>
                <div style={{ width: '100%', height: Math.max(3, (m.val / k.maxMes) * 110), background: 'linear-gradient(180deg,var(--plum),var(--purple))', borderRadius: '6px 6px 0 0', transition: 'height .5s' }} />
                <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="at-card" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
        <div style={{ padding: '14px 18px 4px' }}><h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Ordens recentes</h2></div>
        <div className="at-tablewrap">
          <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['OS', 'Cliente', 'Status', 'Valor', 'Saldo'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{k.recentes.map((o) => { const si = stInfo(o.status); const saldo = Math.max(0, (Number(o.valor) || 0) - (Number(o.valor_pago) || 0))
              return (
                <tr key={o.id}>
                  <td style={tdc}><b>#{o.numero}</b></td>
                  <td style={tdc}>{o.cliente_id ? (nomeCli.get(o.cliente_id) ?? '—') : '—'}</td>
                  <td style={tdc}><span style={{ fontSize: 12, fontWeight: 700, color: si.cor, background: si.cor + '1e', borderRadius: 999, padding: '2px 10px' }}>{si.label}</span></td>
                  <td style={{ ...tdc, fontVariantNumeric: 'tabular-nums' }}>{BRL(o.valor)}</td>
                  <td style={{ ...tdc, fontVariantNumeric: 'tabular-nums', color: saldo > 0 ? 'var(--danger)' : 'var(--ok)' }}>{BRL(saldo)}</td>
                </tr>
              ) })}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, valor, cor, onClick }: { label: string; valor: string; cor: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="at-card" style={{ padding: '14px 16px', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', border: '1px solid var(--line)', background: '#fff' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--tx3)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: cor, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </button>
  )
}

const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const tdc: CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
