import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Empty, ErroCarregar, Loading } from '../ui/kit'

// Recuperação de receita — réplica do módulo vanilla (index.html ~l.2346).
// Lista clientes parados (60+ dias sem OS) e resgata orçamentos/OS canceladas.
const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const onlyDigits = (s: string | null) => (s || '').replace(/\D/g, '')
const todayISO = () => new Date().toISOString().slice(0, 10)
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)

interface Cli { id: string; nome: string; whatsapp: string | null }
interface Os { cliente_id: string | null; valor: number; status: string; data_entrada: string }
interface Inativo extends Cli { dias: number; total: number; n: number }

export default function Recuperacao() {
  const { tenant } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [clientes, setClientes] = useState<Cli[]>([])
  const [ordens, setOrdens] = useState<Os[]>([])

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const [rCli, rOs] = await Promise.all([
      sb.from('clientes').select('id, nome, whatsapp').eq('tenant_id', tenant.id),
      sb.from('ordens').select('cliente_id, valor, status, data_entrada').eq('tenant_id', tenant.id),
    ])
    if (rCli.error || rOs.error) { setErro(true); setLoading(false); return }
    setClientes((rCli.data as Cli[]) ?? [])
    setOrdens((rOs.data as Os[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const d = useMemo(() => {
    const by: Record<string, { last: string | null; total: number; n: number }> = {}
    ordens.forEach((o) => { if (!o.cliente_id) return; const b = by[o.cliente_id] || (by[o.cliente_id] = { last: null, total: 0, n: 0 }); b.n++; b.total += Number(o.valor || 0); if (!b.last || o.data_entrada > b.last) b.last = o.data_entrada })
    const hoje = todayISO()
    const inativos: Inativo[] = clientes.map((c) => { const b = by[c.id]; return { ...c, dias: b && b.last ? daysBetween(b.last, hoje) : -1, total: b ? b.total : 0, n: b ? b.n : 0 } })
      .filter((c) => c.n > 0 && c.dias >= 60).sort((a, b) => b.dias - a.dias)
    return {
      inativos,
      orcamentos: ordens.filter((o) => o.status === 'orcamento').length,
      cancel: ordens.filter((o) => o.status === 'cancelado').length,
      totalInativos: inativos.reduce((a, c) => a + c.total, 0),
    }
  }, [clientes, ordens])

  const msg = (c: Cli) => encodeURIComponent('Olá ' + (c.nome || '').split(' ')[0] + '! Sentimos sua falta no ateliê. Faz um tempinho que você não aparece — tem alguma peça esperando um ajuste? Estou à disposição. — ' + (tenant?.nome || ''))

  if (loading) return <Loading />
  if (erro) return <div className="at-card" style={{ padding: 0 }}><ErroCarregar onRetry={() => void carregar()} /></div>

  return (
    <div>
      <div style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 14 }}>Reative clientes parados e resgate orçamentos que não fecharam — receita que já estava ao seu alcance.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Inativos (60+ dias)" valor={String(d.inativos.length)} cor="var(--plum)" />
        <Kpi label="Orçamentos em aberto" valor={String(d.orcamentos)} cor="var(--purple)" onClick={() => navigate('/ordens')} />
        <Kpi label="Já gasto pelos inativos" valor={BRL(d.totalInativos)} cor="var(--ok)" />
        <Kpi label="OS canceladas" valor={String(d.cancel)} cor="var(--tx2)" onClick={() => navigate('/ordens')} />
      </div>

      <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px 4px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Clientes para reconquistar</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '2px 0 8px' }}>Sem voltar há 60 dias ou mais — comece pelos que mais gastaram.</p>
        </div>
        {d.inativos.length === 0 ? (
          <Empty ico="🔄" titulo="Ninguém parado" texto="Seus clientes estão ativos." />
        ) : (
          <div className="at-tablewrap">
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Cliente', 'Sem voltar', 'Serviços', 'Total gasto', 'Ação'].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
              <tbody>{d.inativos.map((c) => (
                <tr key={c.id}>
                  <td style={td}><b>{c.nome}</b></td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.dias} dias</td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.n}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}><b>{BRL(c.total)}</b></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {c.whatsapp
                      ? <a style={waBtn} target="_blank" rel="noreferrer" href={'https://wa.me/55' + onlyDigits(c.whatsapp) + '?text=' + msg(c)}>Reconquistar</a>
                      : <span style={{ fontSize: 12, color: 'var(--tx3)' }}>sem WhatsApp</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, valor, cor, onClick }: { label: string; valor: string; cor: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="at-card" style={{ padding: '14px 16px', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', border: '1px solid var(--line)', background: '#fff' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--tx3)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: cor, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </button>
  )
}

const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
const waBtn: CSSProperties = { display: 'inline-block', textDecoration: 'none', background: '#25d366', color: '#fff', borderRadius: 8, padding: '5px 12px', fontWeight: 700, fontSize: 13 }
