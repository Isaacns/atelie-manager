import { useEffect, useState, type CSSProperties } from 'react'
import { sb } from '../lib/supabase'
import { Empty, ErroCarregar, Loading } from '../ui/kit'

// Novidades — réplica read-only do bloco "Lançado" do módulo vanilla (index.html ~l.2423).
// Lê public.plataforma_versoes (sistema='atelie') e ordena no cliente: mais recente → mais antiga.
// O bloco "Roadmap · interno" (admin) não é portado — é visão admin-only; o piloto não expõe isAdmin.

interface Versao {
  id: string
  versao: string | null
  data: string | null
  tipo: string
  titulo: string
  descricao: string | null
  status: string
  ordem: number | null
  lancado_em: string | null
}

const TIPO: Record<string, { label: string; cor: string }> = {
  novidade: { label: 'Novidade', cor: '#8e2cb0' },
  melhoria: { label: 'Melhoria', cor: '#2f8f8f' },
  correcao: { label: 'Correção', cor: '#3f7d52' },
}

// cmpVer / cmpNovidadeDesc: portados 1:1 do vanilla (index.html ~l.471-485).
// Ordem real: data de lançamento desc → semver real desc → `ordem` desc.
// (as versões-semente 1.0.0–1.10.0 têm `ordem` invertido — não dá para confiar só nele.)
function cmpVer(a: string | null, b: string | null): number {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1 }
  return 0
}
const novDateKey = (r: Versao) => String(r.lancado_em || r.data || '').slice(0, 19)
function cmpNovidadeDesc(a: Versao, b: Versao): number {
  const da = novDateKey(a), db = novDateKey(b)
  if (da !== db) return da < db ? 1 : -1
  const cv = cmpVer(b.versao, a.versao); if (cv) return cv
  return (Number(b.ordem) || 0) - (Number(a.ordem) || 0)
}

function fmtData(s: string | null): string {
  if (!s) return ''
  const iso = String(s).slice(0, 10)
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

export default function Novidades() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [rows, setRows] = useState<Versao[]>([])

  async function carregar() {
    setLoading(true); setErro(false)
    const { data, error } = await sb.schema('public')
      .from('plataforma_versoes')
      .select('id, versao, data, tipo, titulo, descricao, status, ordem, lancado_em')
      .eq('sistema', 'atelie')
      .order('lancado_em', { ascending: false, nullsFirst: false })
    if (error) { setErro(true); setLoading(false); return }
    setRows(((data as Versao[]) ?? []).slice().sort(cmpNovidadeDesc))
    setLoading(false)
  }
  useEffect(() => { void carregar() }, [])

  if (loading) return <Loading />
  if (erro) return <div className="at-card" style={{ padding: 0 }}><ErroCarregar onRetry={() => void carregar()} /></div>

  const lancados = rows.filter((r) => r.status === 'lancado')

  return (
    <div>
      <div style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 14 }}>O que há de novo no Ateliê Manager — melhorias entregues para você.</div>
      <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px 6px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Lançado</h2>
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '2px 0 0' }}>Já disponível no seu sistema.</p>
        </div>
        {lancados.length === 0 ? (
          <Empty ico="✨" titulo="Sem novidades ainda" texto="Em breve, melhorias por aqui." />
        ) : (
          <div>
            {lancados.map((r) => {
              const t = TIPO[r.tipo] ?? { label: r.tipo, cor: 'var(--tx3)' }
              const quando = fmtData(r.lancado_em || r.data)
              return (
                <div key={r.id} style={item}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: t.cor, borderRadius: 999, padding: '2px 9px' }}>{t.label}</span>
                    <b style={{ fontSize: 14 }}>{r.titulo}</b>
                    {r.versao && <span style={{ fontSize: 12, color: 'var(--tx3)' }}>v{r.versao}</span>}
                    {quando && <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 'auto' }}>{quando}</span>}
                  </div>
                  {r.descricao && <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginTop: 4, lineHeight: 1.45 }}>{r.descricao}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const item: CSSProperties = { padding: '12px 18px', borderTop: '1px solid var(--line)' }
