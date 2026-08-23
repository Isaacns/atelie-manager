import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { sb, type Tenant } from '../lib/supabase'

interface AuthState {
  session: Session | null
  tenant: Tenant | null
  role: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    sb.auth.getSession().then(({ data }) => { if (vivo) setSession(data.session) })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s) })
    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    let vivo = true
    async function resolver() {
      if (!session) { setTenant(null); setRole(null); setLoading(false); return }
      setLoading(true)
      const { data, error } = await sb
        .from('tenant_memberships')
        .select('tenant_id, role, ativo, tenants(id, nome, slug, status, plano)')
        .eq('user_id', session.user.id)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle()
      if (!vivo) return
      if (error || !data) { setTenant(null); setRole(null); setLoading(false); return }
      const t = (data.tenants as unknown as Tenant | Tenant[] | null)
      setTenant(Array.isArray(t) ? (t[0] ?? null) : t)
      setRole((data.role as string) ?? null)
      setLoading(false)
    }
    void resolver()
    return () => { vivo = false }
  }, [session])

  async function signOut() { await sb.auth.signOut() }

  return <Ctx.Provider value={{ session, tenant, role, loading, signOut }}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fora do AuthProvider')
  return v
}
