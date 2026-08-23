import { useState, type CSSProperties, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './screens/Login'
import Clientes from './screens/Clientes'
import Ordens from './screens/Ordens'
import Servicos from './screens/Servicos'
import Financeiro from './screens/Financeiro'
import Dashboard from './screens/Dashboard'
import Estoque from './screens/Estoque'
import Perfil from './screens/Perfil'
import Config from './screens/Config'
import Agenda from './screens/Agenda'
import Recuperacao from './screens/Recuperacao'
import Alavancagem from './screens/Alavancagem'

const NAV: { to: string; label: string }[] = [{ to: '/', label: 'Início' }, { to: '/ordens', label: 'Ordens' }, { to: '/clientes', label: 'Clientes' }, { to: '/servicos', label: 'Serviços' }, { to: '/agenda', label: 'Agenda' }, { to: '/estoque', label: 'Estoque' }, { to: '/financeiro', label: 'Financeiro' }, { to: '/recuperacao', label: 'Recuperação' }, { to: '/alavancagem', label: 'Alavancagem' }]

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

// Menu do usuário no canto superior direito (padrão VIZIO).
function UserMenu() {
  const { tenant, role, signOut } = useAuth()
  const nav = useNavigate()
  const [aberto, setAberto] = useState(false)
  const gestao = role === 'owner' || role === 'gestor'
  const ir = (to: string) => { setAberto(false); nav(to) }

  const item: CSSProperties = { display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', font: 'inherit', fontWeight: 600, fontSize: 14, color: 'var(--ink)', padding: '9px 14px', cursor: 'pointer' }

  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <button onClick={() => setAberto((v) => !v)} aria-haspopup="menu" aria-expanded={aberto} aria-label="Menu do usuário"
        style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--line)', background: '#fff', color: 'var(--tx2)', borderRadius: 999, padding: '5px 6px 5px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role ?? 'Conta'}</span>
        <span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--plum),var(--purple))', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14 }}>👤</span>
      </button>
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 21, minWidth: 210, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 12px 30px -12px rgba(68,42,62,.4)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="display" style={{ fontSize: 14, fontWeight: 600, color: 'var(--plum)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant?.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{role ?? '—'}</div>
            </div>
            <button role="menuitem" style={item} onClick={() => ir('/perfil')}>Meu perfil</button>
            {gestao && <button role="menuitem" style={item} onClick={() => ir('/config')}>Configurações</button>}
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <button role="menuitem" style={{ ...item, color: 'var(--danger)' }} onClick={() => { setAberto(false); void signOut() }}>Sair</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Shell() {
  const { tenant, role } = useAuth()

  return (
    <div style={{ minHeight: '100%' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--plum)', lineHeight: 1.1 }}>{tenant?.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Ateliê Manager · piloto React {role ? '· ' + role : ''}</div>
          </div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: '#f2ecf0', borderRadius: 10, padding: 3, justifyContent: 'flex-end' }}>
            {NAV.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'} style={({ isActive }) => ({ textDecoration: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600, fontSize: 13, padding: '6px 14px', borderRadius: 8, background: isActive ? '#fff' : 'transparent', color: isActive ? 'var(--plum)' : 'var(--tx2)', boxShadow: isActive ? '0 1px 4px rgba(68,42,62,.15)' : 'none' })}>{t.label}</NavLink>
            ))}
          </nav>
          <UserMenu />
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
              <Route path="agenda" element={<Pagina titulo="Agenda"><Agenda /></Pagina>} />
              <Route path="estoque" element={<Pagina titulo="Estoque"><Estoque /></Pagina>} />
              <Route path="financeiro" element={<Pagina titulo="Financeiro"><Financeiro /></Pagina>} />
              <Route path="recuperacao" element={<Pagina titulo="Recuperação de receita"><Recuperacao /></Pagina>} />
              <Route path="alavancagem" element={<Pagina titulo="Alavancagem"><Alavancagem /></Pagina>} />
              <Route path="perfil" element={<Pagina titulo="Meu perfil"><Perfil /></Pagina>} />
              <Route path="config" element={<Pagina titulo="Configurações"><Config /></Pagina>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
