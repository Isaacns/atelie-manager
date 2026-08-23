import { createClient } from '@supabase/supabase-js'

// Mesmo backend do app vanilla do Ateliê — projeto emyjzjadmxgbtmxnzazu, schema `atelie`.
// A chave publishable (anon) é segura no bundle do cliente; RLS protege os dados.
const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const sb = createClient(url, anon, {
  db: { schema: 'atelie' },
  auth: { persistSession: true, autoRefreshToken: true },
})

export interface Tenant {
  id: string
  nome: string
  slug: string
  status: string
  plano: string | null
}
export interface Membership {
  tenant_id: string
  role: string
  ativo: boolean
  tenants: Tenant | null
}
export type OSStatus =
  | 'orcamento' | 'aberto' | 'em_andamento' | 'costurando' | 'aguardando_prova'
  | 'aguardando_retirada' | 'finalizado' | 'entregue' | 'cancelado'

export const OS_STATUS: { v: OSStatus; label: string; cor: string }[] = [
  { v: 'orcamento', label: 'Orçamento', cor: '#8a7e86' },
  { v: 'aberto', label: 'Aberto', cor: '#2f8f8f' },
  { v: 'em_andamento', label: 'Em andamento', cor: '#2563eb' },
  { v: 'costurando', label: 'Costurando', cor: '#8e2cb0' },
  { v: 'aguardando_prova', label: 'Aguardando prova', cor: '#b98325' },
  { v: 'aguardando_retirada', label: 'Aguardando retirada', cor: '#b26a00' },
  { v: 'finalizado', label: 'Finalizado', cor: '#16a34a' },
  { v: 'entregue', label: 'Entregue', cor: '#0f7a3d' },
  { v: 'cancelado', label: 'Cancelado', cor: '#dc2626' },
]
export interface Ordem {
  id: string
  tenant_id: string
  numero: number
  cliente_id: string | null
  status: OSStatus
  descricao: string | null
  valor: number
  valor_pago: number
  data_entrada: string
  prazo: string | null
  data_prova: string | null
  atrasado: boolean
  observacoes: string | null
}

export type FinTipo = 'receita' | 'despesa'
export interface Categoria { id: string; tenant_id: string; nome: string; tipo: string }
export interface Lancamento {
  id: string
  tenant_id: string
  tipo: FinTipo
  categoria_id: string | null
  descricao: string | null
  valor: number
  vencimento: string | null
  pago: boolean
  pago_em: string | null
  ordem_id: string | null
  cliente_id: string | null
}

// Recalcula ordens.valor_pago = soma das receitas QUITADAS ligadas à ordem.
// (não há trigger que faça isso; chamamos após qualquer mudança de pagamento.)
export async function recomputeValorPago(ordemId: string): Promise<void> {
  const { data } = await sb.from('financeiro_lancamentos').select('valor').eq('ordem_id', ordemId).eq('tipo', 'receita').eq('pago', true)
  const pago = (data as { valor: number }[] | null)?.reduce((s, r) => s + (Number(r.valor) || 0), 0) ?? 0
  await sb.from('ordens').update({ valor_pago: pago }).eq('id', ordemId)
}

export interface Produto {
  id: string
  tenant_id: string
  nome: string
  categoria: string | null
  unidade: string
  quantidade: number
  quantidade_minima: number
  preco: number
  fornecedor: string | null
  localizacao: string | null
}
export type MovTipo = 'entrada' | 'saida' | 'ajuste'

export interface Servico {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  preco_base: number
  ativo: boolean
}
export interface OrdemItem {
  id?: string
  tenant_id?: string
  ordem_id?: string
  servico_id: string | null
  descricao: string
  quantidade: number
  valor_unit: number
  subtotal?: number
  posicao: number
}

export interface Cliente {
  id: string
  tenant_id: string
  nome: string
  telefone: string | null
  whatsapp: string | null
  cpf: string | null
  nascimento: string | null
  cep: string | null
  endereco: string | null
  bairro: string | null
  cidade: string | null
  observacoes: string | null
  medidas: Record<string, string> | null
  created_at?: string
}

// Medidas (cm) guardadas no jsonb clientes.medidas — mesmas chaves do app vanilla.
export const MEDIDAS: { k: string; label: string }[] = [
  { k: 'altura', label: 'Altura' }, { k: 'busto', label: 'Busto' }, { k: 'cintura', label: 'Cintura' },
  { k: 'quadril', label: 'Quadril' }, { k: 'ombro', label: 'Ombro' }, { k: 'manga', label: 'Manga' },
  { k: 'comprimento', label: 'Comprim.' }, { k: 'largura', label: 'Largura' }, { k: 'gancho', label: 'Gancho' },
]
