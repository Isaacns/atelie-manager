import type { ReactNode } from 'react'
import { HashRouter, Routes, Route, Outlet, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './screens/Login'
import Clientes from './screens/Clientes'
import Ordens from './screens/Ordens'
import Servicos from './screens/Servicos'
import Financeiro from './screens/Financeiro'
import Dashboard from './screens/Dashboard'
import Estoque from './screens/Estoque'

const NAV: { to: string; label: string }[] = [{ to: '/', label: 'Início' }, { to: '/ordens', label: 'Ordens' }, { to: '/clientes', label: 'Clientes' }, { to: '/servicos', label: 'Serviços' }, { to: '/estoque', label: 'Estoque' }, { to: '/financeiro', label: 'Financeiro' }]

function Gate() {
  const { session, tenant, loading, signOut } = useAuth()

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

  return <Outlet />
}

function Shell() {
  const { tenant, role, signOut } = useAuth()

  return (
    <div style={{ minHeight: '100%' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--plum)', lineHeight: 1.1 }}>{tenant?.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Ateliê Manager · piloto React {role ? '· ' + role : ''}</div>
          </div>
          <nav style={{ display: 'flex', gap: 4, background: '#f2ecf0', borderRadius: 10, padding: 3 }}>
            {NAV.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'} style={({ isActive }) => ({ textDecoration: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600, fontSize: 13, padding: '6px 14px', borderRadius: 8, background: isActive ? '#fff' : 'transparent', color: isActive ? 'var(--plum)' : 'var(--tx2)', boxShadow: isActive ? '0 1px 4px rgba(68,42,62,.15)' : 'none' })}>{t.label}</NavLink>
            ))}
          </nav>
          <button onClick={() => void signOut()} style={{ border: '1px solid var(--line)', background: '#fff', color: 'var(--tx2)', borderRadius: 9, padding: '7px 13px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Sair</button>
        </div>
      </header>
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '18px' }}>
        <Outlet />
      </main>
    </div>
  )
}

function Pagina({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '2px 0 14px' }}>{titulo}</h1>
      {children}
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Gate />}>
            <Route element={<Shell />}>
              <Route index element={<Pagina titulo="Visão geral"><Dashboard /></Pagina>} />
              <Route path="ordens" element={<Pagina titulo="Ordens de serviço"><Ordens /></Pagina>} />
              <Route path="clientes" element={<Pagina titulo="Clientes"><Clientes /></Pagina>} />
              <Route path="servicos" element={<Pagina titulo="Serviços"><Servicos /></Pagina>} />
              <Route path="estoque" element={<Pagina titulo="Estoque"><Estoque /></Pagina>} />
              <Route path="financeiro" element={<Pagina titulo="Financeiro"><Financeiro /></Pagina>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
