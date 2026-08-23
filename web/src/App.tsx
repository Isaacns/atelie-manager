import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './screens/Login'
import Clientes from './screens/Clientes'
import Ordens from './screens/Ordens'
import Servicos from './screens/Servicos'
import Financeiro from './screens/Financeiro'
import Dashboard from './screens/Dashboard'
import Estoque from './screens/Estoque'

type Tab = 'inicio' | 'clientes' | 'ordens' | 'servicos' | 'financeiro' | 'estoque'
const TABS: { k: Tab; label: string }[] = [{ k: 'inicio', label: 'Início' }, { k: 'ordens', label: 'Ordens' }, { k: 'clientes', label: 'Clientes' }, { k: 'servicos', label: 'Serviços' }, { k: 'estoque', label: 'Estoque' }, { k: 'financeiro', label: 'Financeiro' }]

function Shell() {
  const { session, tenant, role, loading, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('inicio')

  if (!session) return <Login />
  if (loading) {
    return <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', color: 'var(--tx3)' }}>Carregando…</div>
  }
  if (!tenant) {
    return (
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div className="display" style={{ fontSize: 20, color: 'var(--plum)', marginBottom: 6 }}>Sem ateliê vinculado</div>
          <p style={{ color: 'var(--tx2)', fontSize: 14, maxWidth: 360 }}>Sua conta ainda não está associada a um ateliê ativo. Fale com o administrador.</p>
          <button className="at-btn" style={{ width: 'auto', marginTop: 12 }} onClick={() => void signOut()}>Sair</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--plum)', lineHeight: 1.1 }}>{tenant.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Ateliê Manager · piloto React {role ? '· ' + role : ''}</div>
          </div>
          <nav style={{ display: 'flex', gap: 4, background: '#f2ecf0', borderRadius: 10, padding: 3 }}>
            {TABS.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{ border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600, fontSize: 13, padding: '6px 14px', borderRadius: 8, background: tab === t.k ? '#fff' : 'transparent', color: tab === t.k ? 'var(--plum)' : 'var(--tx2)', boxShadow: tab === t.k ? '0 1px 4px rgba(68,42,62,.15)' : 'none' }}>{t.label}</button>
            ))}
          </nav>
          <button onClick={() => void signOut()} style={{ border: '1px solid var(--line)', background: '#fff', color: 'var(--tx2)', borderRadius: 9, padding: '7px 13px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Sair</button>
        </div>
      </header>
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '18px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '2px 0 14px' }}>{tab === 'inicio' ? 'Visão geral' : tab === 'ordens' ? 'Ordens de serviço' : tab === 'servicos' ? 'Serviços' : tab === 'estoque' ? 'Estoque' : tab === 'financeiro' ? 'Financeiro' : 'Clientes'}</h1>
        {tab === 'inicio' ? <Dashboard onGo={setTab} /> : tab === 'ordens' ? <Ordens /> : tab === 'servicos' ? <Servicos /> : tab === 'estoque' ? <Estoque /> : tab === 'financeiro' ? <Financeiro /> : <Clientes />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
