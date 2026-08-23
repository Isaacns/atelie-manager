import { useEffect, useState, type CSSProperties } from 'react'
import { sb } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { ErroCarregar, Loading, Modal, useToast, errMsg } from '../ui/kit'

// Fiscal (NFS-e) — réplica do módulo vanilla (index.html ~l.2171).
// NÃO há emissão automática (o "Caminho B" via PlugNotas é backlog e não existe no produto):
// é um helper MANUAL do Emissor Nacional gratuito (gov.br/nfse). A usuária emite no portal
// e registra o número de volta em atelie.ordens (nfse_emitida/nfse_numero/nfse_emitida_em).

const BRL = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function fmtDateTime(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface FiscalCfg { portal?: string; regime?: string; item_lc116?: string; iss_obs?: string; descricao_servico?: string }
interface Cli { id: string; nome: string; cpf: string | null }
interface Os {
  id: string; numero: number; valor: number; status: string; descricao: string | null; cliente_id: string | null
  nfse_emitida: boolean | null; nfse_numero: string | null; nfse_emitida_em: string | null
  cliente?: Cli | null
}

export default function Fiscal() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [cfg, setCfg] = useState<FiscalCfg>({})
  const [cnpj, setCnpj] = useState<string | null>(null)
  const [rows, setRows] = useState<Os[]>([])
  const [emit, setEmit] = useState<Os | null>(null)

  const portal = cfg.portal || 'https://www.nfse.gov.br'
  const regime = cfg.regime || 'MEI'

  async function carregar() {
    if (!tenant) return
    setLoading(true); setErro(false)
    const [rSet, rOs] = await Promise.all([
      sb.from('tenant_settings').select('fiscal, cnpj').eq('tenant_id', tenant.id).maybeSingle(),
      sb.from('ordens')
        .select('id, numero, valor, status, descricao, cliente_id, nfse_emitida, nfse_numero, nfse_emitida_em')
        .eq('tenant_id', tenant.id).in('status', ['finalizado', 'entregue']).order('numero', { ascending: false }),
    ])
    if (rSet.error || rOs.error) { setErro(true); setLoading(false); return }
    const st = rSet.data as { fiscal: FiscalCfg | null; cnpj: string | null } | null
    setCfg((st?.fiscal as FiscalCfg) || {})
    setCnpj(st?.cnpj ?? null)
    const os = (rOs.data as Os[]) ?? []
    const ids = [...new Set(os.map((o) => o.cliente_id).filter(Boolean))] as string[]
    const cmap: Record<string, Cli> = {}
    if (ids.length) {
      const { data: cs } = await sb.from('clientes').select('id, nome, cpf').in('id', ids)
      ;(cs as Cli[] | null)?.forEach((c) => { cmap[c.id] = c })
    }
    setRows(os.map((o) => ({ ...o, cliente: o.cliente_id ? cmap[o.cliente_id] ?? null : null })))
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [tenant])

  if (loading) return <Loading />
  if (erro) return <div className="at-card" style={{ padding: 0 }}><ErroCarregar onRetry={() => void carregar()} /></div>

  const pend = rows.filter((o) => !o.nfse_emitida)
  const done = rows.filter((o) => o.nfse_emitida)
  const totalPend = pend.reduce((a, o) => a + Number(o.valor || 0), 0)

  return (
    <div>
      <div style={notice}>
        <b>NFS-e pelo Emissor Nacional — gratuito.</b> Como <b>{regime}</b>, a nota de serviço é emitida no{' '}
        <b>Portal Nacional da NFS-e</b>, sem custo e sem gateway. O sistema prepara os dados de cada serviço e guarda o
        número da nota para o seu controle.
        {cfg.iss_obs && <><br /><span style={{ color: 'var(--tx3)' }}>{cfg.iss_obs}</span></>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div className="at-card" style={{ padding: 16 }}>
          <h2 style={h3}>Identidade fiscal</h2>
          <p style={desc}>Dados usados na emissão da nota de serviço.</p>
          <div style={{ marginTop: 8 }}>
            <Linha k="CNPJ" v={cnpj || '—'} />
            <Linha k="Regime" v={regime} />
            <Linha k="Serviço · LC 116" v={cfg.item_lc116 || '14.09'} />
          </div>
          {cfg.descricao_servico && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--tx3)' }}>{cfg.descricao_servico}</p>}
          <a style={{ ...btnPri, marginTop: 12, display: 'inline-flex' }} href={portal} target="_blank" rel="noreferrer">Abrir Emissor Nacional</a>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--tx3)' }}>Entre com sua conta <b>gov.br</b>. Há também o app <b>NFS-e Mobile</b> (Android/iOS).</p>
        </div>

        <div className="at-card" style={{ padding: 16 }}>
          <h2 style={h3}>Serviços a emitir</h2>
          <p style={desc}>OS finalizadas/entregues ainda sem NFS-e.</p>
          <div style={{ marginTop: 8 }}>
            <Linha k="Pendentes" v={String(pend.length)} />
            <Linha k="Valor total" v={BRL(totalPend)} />
          </div>
          {pend.length === 0 ? (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--tx3)' }}>Nenhum serviço pendente de nota. ✓</div>
          ) : (
            <div className="at-tablewrap" style={{ marginTop: 10 }}>
              <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>#</th><th style={{ ...th, textAlign: 'left' }}>Serviço</th><th style={{ ...th, textAlign: 'right' }}>Valor</th><th style={th} /></tr></thead>
                <tbody>{pend.slice(0, 10).map((o) => (
                  <tr key={o.id}>
                    <td style={{ ...td, fontWeight: 700 }}>{o.numero}</td>
                    <td style={td}>{o.descricao || '—'}<br /><span style={{ fontSize: 12, color: 'var(--tx3)' }}>{o.cliente?.nome || 'Consumidor'}</span></td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{BRL(o.valor)}</td>
                    <td style={{ ...td, textAlign: 'right' }}><button style={btnSmPri} onClick={() => setEmit(o)}>Emitir</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {done.length > 0 && (
        <div className="at-card" style={{ padding: 16, marginTop: 14 }}>
          <h2 style={h3}>Notas emitidas</h2>
          <p style={desc}>Registro das NFS-e já emitidas no portal.</p>
          <div className="at-tablewrap" style={{ marginTop: 8 }}>
            <table className="at-rt" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['NFS-e', 'OS', 'Serviço', 'Valor', 'Emitida em'].map((hh, i) => <th key={hh} style={{ ...th, textAlign: i === 3 ? 'right' : 'left' }}>{hh}</th>)}</tr></thead>
              <tbody>{done.slice(0, 20).map((o) => (
                <tr key={o.id}>
                  <td style={{ ...td, fontWeight: 700 }}>{o.nfse_numero || '—'}</td>
                  <td style={td}>#{o.numero}</td>
                  <td style={td}>{o.descricao || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{BRL(o.valor)}</td>
                  <td style={{ ...td, color: 'var(--tx2)' }}>{fmtDateTime(o.nfse_emitida_em)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {emit && <EmitirNfse ordem={emit} portal={portal} onClose={() => setEmit(null)} onDone={() => { setEmit(null); void carregar() }} />}
    </div>
  )
}

function EmitirNfse({ ordem, portal, onClose, onDone }: { ordem: Os; portal: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [num, setNum] = useState('')
  const [busy, setBusy] = useState(false)
  const disc = (ordem.descricao || 'Serviço de costura') + ' — Ref. OS #' + ordem.numero

  async function marcar() {
    if (!num.trim()) { toast('Informe o número da NFS-e emitida.', true); return }
    setBusy(true)
    const { error } = await sb.from('ordens').update({ nfse_emitida: true, nfse_numero: num.trim(), nfse_emitida_em: new Date().toISOString() }).eq('id', ordem.id)
    setBusy(false)
    if (error) { toast('Erro ao registrar: ' + errMsg(error), true); return }
    toast('NFS-e registrada!')
    onDone()
  }
  function copiar() { try { void navigator.clipboard.writeText(disc); toast('Discriminação copiada.') } catch { toast('Copie manualmente.', true) } }

  return (
    <Modal title={'Emitir NFS-e — OS #' + ordem.numero} onClose={onClose}>
      <p style={{ marginTop: 0, color: 'var(--tx2)', fontSize: 14 }}>Emita a nota no <b>Portal Nacional</b> com os dados abaixo e depois registre o número aqui, para controle.</p>
      <div style={{ marginBottom: 4 }}>
        <Linha k="Tomador" v={ordem.cliente?.nome || 'Consumidor não identificado'} />
        {ordem.cliente?.cpf && <Linha k="CPF/CNPJ" v={ordem.cliente.cpf} />}
        <Linha k="Valor do serviço" v={BRL(ordem.valor)} />
      </div>
      <label style={lbl}>Discriminação do serviço</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input readOnly value={disc} onFocus={(e) => e.target.select()} style={inp} />
        <button type="button" style={btnSm} onClick={copiar}>copiar</button>
      </div>
      <label style={lbl}>Número da NFS-e (após emitir no portal)</label>
      <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="ex.: 000123" style={inp} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <a style={btnPri} href={portal} target="_blank" rel="noreferrer">Abrir Emissor Nacional</a>
        <button style={btnGhost} disabled={busy} onClick={() => void marcar()}>{busy ? '…' : 'Registrar nº da nota'}</button>
      </div>
    </Modal>
  )
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
      <span style={{ color: 'var(--tx3)' }}>{k}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

const notice: CSSProperties = { background: 'color-mix(in srgb, var(--plum) 7%, #fff)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--tx1, var(--ink))', marginBottom: 16, lineHeight: 1.5 }
const h3: CSSProperties = { fontSize: 16, fontWeight: 600, margin: 0 }
const desc: CSSProperties = { fontSize: 13, color: 'var(--tx2)', margin: '2px 0 0' }
const th: CSSProperties = { fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '9px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right' }
const td: CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 14 }
const lbl: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', margin: '10px 0 5px' }
const inp: CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 15, background: '#fff', color: 'var(--ink)' }
const btnPri: CSSProperties = { border: 0, background: 'var(--plum)', color: '#fff', borderRadius: 10, padding: '9px 15px', fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none', font: 'inherit' }
const btnGhost: CSSProperties = { border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', borderRadius: 10, padding: '9px 15px', fontWeight: 600, cursor: 'pointer', font: 'inherit' }
const btnSm: CSSProperties = { border: '1px solid var(--line)', background: '#fff', color: 'var(--plum)', borderRadius: 8, padding: '0 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', font: 'inherit', whiteSpace: 'nowrap' }
const btnSmPri: CSSProperties = { border: 0, background: 'var(--plum)', color: '#fff', borderRadius: 8, padding: '5px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer', font: 'inherit' }
