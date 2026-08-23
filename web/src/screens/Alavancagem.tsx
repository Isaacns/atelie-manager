import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { sb, type Servico } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Empty, ErroCarregar, Loading, inp } from '../ui/kit'

// Alavancagem — réplica do módulo vanilla (index.html ~l.2383).
// Escolhe público + serviço em oferta + % desconto e dispara oferta por WhatsApp.
const BRL = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const onlyDigits = (s: string | null) => (s || '').replace(/\D/g, '')
const bdayThisMonth = (c: Cli) => !!c.nascimento && Number(c.nascimento.slice(5, 7)) === new Date().getMonth() + 1

type Seg = 'todos' | 'aniversariantes' | 'frequentes' | 'novos'
const SEGS: { k: Seg; l: string }[] = [
  { k: 'todos', l: 'Todos' },
  { k: 'aniversariantes', l: 'Aniversariantes do mês' },
  { k: 'frequentes', l: 'Frequentes (3+)' },
  { k: 'novos', l: 'Novos (1 visita)' },
]
interface Cli { id: string; nome: string; whatsapp: string | null; nascimento: string | null }

export default function Alavancagem() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [clientes, setClientes] = useState<Cli[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [seg, setSeg] = useState<Seg>('todos')
  const [servId, setServId] = useState('')
  const [desc, setDesc] = useState(15)

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const [rCli, rServ, rOs] = await Promise.all([
      sb.from('clientes').select('id, nome, whatsapp, nascimento').eq('tenant_id', tenant.id).order('nome'),
      sb.from('servicos').select('*').eq('tenant_id', tenant.id).order('nome'),
      sb.from('ordens').select('cliente_id').eq('tenant_id', tenant.id),
    ])
    if (rCli.error || rServ.error || rOs.error) { setErro(true); setLoading(false); return }
    setClientes((rCli.data as Cli[]) ?? [])
    setServicos((rServ.data as Servico[]) ?? [])
    const m: Record<string, number> = {}
    ;((rOs.data as { cliente_id: string | null }[]) ?? []).forEach((o) => { if (o.cliente_id) m[o.cliente_id] = (m[o.cliente_id] || 0) + 1 })
    setCounts(m)
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  const serv = servicos.find((s) => s.id === servId)
  const preco = serv ? Number(serv.preco_base) : 0
  const precoDesc = preco * (1 - Number(desc || 0) / 100)

  const alvo = useMemo(() => {
    let list = clientes.filter((c) => c.whatsapp)
    if (seg === 'aniversariantes') list = list.filter(bdayThisMonth)
    if (seg === 'frequentes') list = list.filter((c) => (counts[c.id] || 0) >= 3)
    if (seg === 'novos') list = list.filter((c) => (counts[c.id] || 0) <= 1)
    return list
  }, [clientes, seg, counts])

  const msg = (c: Cli) => encodeURIComponent('Olá ' + (c.nome || '').split(' ')[0] + '! Oferta especial pra você'
    + (serv ? ' em ' + serv.nome + ': de ' + BRL(preco) + ' por ' + BRL(precoDesc) + ' (' + desc + '% off)' : ' aqui no ateliê') + '. Vamos agendar? — ' + (tenant?.nome || ''))

  if (loading) return <Loading />
  if (erro) return <div className="at-card" style={{ padding: 0 }}><ErroCarregar onRetry={() => void carregar()} /></div>

  return (
    <div>
      <div style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 14 }}>Gere mais receita da base atual: escolha um público, um serviço e um desconto, e dispare a oferta por WhatsApp.</div>

      <div className="at-card" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>Público-alvo</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {SEGS.map((s) => <button key={s.k} onClick={() => setSeg(s.k)} style={{ ...chip, ...(seg === s.k ? chipOn : null) }}>{s.l}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }}>Serviço em oferta</span>
            <select style={inp} value={servId} onChange={(e) => setServId(e.target.value)}>
              <option value="">— Oferta genérica —</option>
              {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome} · {BRL(s.preco_base)}</option>)}
            </select>
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }}>Desconto (%)</span>
            <input style={inp} type="number" min={0} max={90} value={desc} onChange={(e) => setDesc(Number(e.target.value))} />
          </label>
        </div>
        {serv && <div style={{ marginTop: 12, fontSize: 14, background: '#faf6fb', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>{serv.nome}: de <b>{BRL(preco)}</b> por <b>{BRL(precoDesc)}</b> ({desc}% off).</div>}
      </div>

      <div className="at-card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '14px 18px 4px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Clientes no público ({alvo.length})</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '2px 0 8px' }}>Cada disparo abre o WhatsApp com a mensagem pronta.</p>
        </div>
        {alvo.length === 0 ? (
          <Empty ico="🚀" titulo="Nenhum cliente" texto="Ajuste o público ou cadastre WhatsApp nos clientes." />
        ) : (
          <div className="at-tablewrap">
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Cliente', 'Serviços feitos', 'Enviar oferta'].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
              <tbody>{alvo.map((c) => (
                <tr key={c.id}>
                  <td style={td}><b>{c.nome}</b></td>
                  <td style={{ ...td, textAlign: 'right' }}>{counts[c.id] || 0}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <a style={waBtn} target="_blank" rel="noreferrer" href={'https://wa.me/55' + onlyDigits(c.whatsapp) + '?text=' + msg(c)}>Oferecer</a>
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

const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const td: CSSProperties = { padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 14 }
const chip: CSSProperties = { border: '1px solid var(--line)', background: '#fff', color: 'var(--tx2)', borderRadius: 999, padding: '6px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const chipOn: CSSProperties = { background: 'var(--plum)', color: '#fff', borderColor: 'var(--plum)' }
const waBtn: CSSProperties = { display: 'inline-block', textDecoration: 'none', background: '#25d366', color: '#fff', borderRadius: 8, padding: '5px 12px', fontWeight: 700, fontSize: 13 }
