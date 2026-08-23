import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Outlet, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { I, Ic, BrandLogo, ByVizio, LivingBg } from './ui/brand'
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
import Relatorios from './screens/Relatorios'
import Fiscal from './screens/Fiscal'
import Novidades from './screens/Novidades'

// NAV no molde do vanilla: separadores de grupo + itens laterais com ícone.
// `title` é o texto exibido na topbar (h2); `label` é o rótulo do menu lateral.
type NavItem = { g?: string; p?: string; l?: string; i?: string; title?: string; roles?: string[] }
const NAV: NavItem[] = [
  { g: 'Gestão' },
  { p: '/', l: 'HOME', i: I.home, title: 'HOME' },
  { p: '/clientes', l: 'Clientes', i: I.users, title: 'Clientes' },
  { p: '/ordens', l: 'Ordens de serviço', i: I.scissors, title: 'Ordens de serviço' },
  { p: '/servicos', l: 'Serviços', i: I.tag, title: 'Serviços' },
  { g: 'Operação' },
  { p: '/agenda', l: 'Agenda', i: I.spark, title: 'Agenda' },
  { p: '/estoque', l: 'Estoque', i: I.box, title: 'Estoque' },
  { p: '/financeiro', l: 'Financeiro', i: I.money, title: 'Financeiro', roles: ['owner', 'gestor', 'financeiro'] },
  { p: '/relatorios', l: 'Relatórios', i: I.chart, title: 'Relatórios' },
  { p: '/fiscal', l: 'Fiscal (NFS-e)', i: I.file, title: 'Fiscal (NFS-e)', roles: ['owner', 'gestor', 'financeiro'] },
  { g: 'Crescimento' },
  { p: '/recuperacao', l: 'Recuperação', i: I.refresh, title: 'Recuperação de receita' },
  { p: '/alavancagem', l: 'Alavancagem', i: I.rocket, title: 'Alavancagem' },
  { g: 'Ateliê' },
  { p: '/novidades', l: 'Novidades', i: I.spark, title: 'Novidades' },
  { p: '/config', l: 'Configurações', i: I.gear, title: 'Configurações', roles: ['owner', 'gestor'] },
]
const TITLES: Record<string, string> = { '/perfil': 'Meu perfil' }
NAV.forEach((it) => { if (it.p && it.title) TITLES[it.p] = it.title })

function Gate() {
  const { session, tenant, loading, signOut } = useAuth()

  if (!session) return <Login />
  if (loading) return <div className="center"><div className="sub">Carregando…</div></div>
  if (!tenant) {
    return (
      <>
        <LivingBg />
        <div className="center"><div className="glass card" style={{ textAlign: 'center' }}>
          <h1 className="title">Sem ateliê vinculado</h1>
          <p className="sub">Sua conta ainda não está associada a um ateliê ativo. Fale com o administrador.</p>
          <button className="btn pri" style={{ margin: '0 auto' }} onClick={() => void signOut()}><Ic d={I.back} />Sair</button>
        </div></div>
      </>
    )
  }
  return <Outlet />
}

// Menu do usuário no canto superior direito (padrão VIZIO): perfil / config / sair.
function UserMenu() {
  const { tenant, role, signOut } = useAuth()
  const nav = useNavigate()
  const [aberto, setAberto] = useState(false)
  const gestao = role === 'owner' || role === 'gestor'
  const ir = (to: string) => { setAberto(false); nav(to) }
  const inicial = (tenant?.nome || 'A').trim().charAt(0).toUpperCase()

  return (
    <div className="usermenu">
      <button className="user" aria-haspopup="menu" aria-expanded={aberto} aria-label="Menu do usuário" onClick={() => setAberto((v) => !v)}>
        <span className="txt"><b>{role ?? 'Conta'}</b><span>Minha conta</span></span>
        <span className="av" aria-hidden>{inicial}</span>
      </button>
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
          <div className="pop" role="menu">
            <div className="hd"><b>{tenant?.nome}</b><span>{role ?? '—'}</span></div>
            <button role="menuitem" onClick={() => ir('/perfil')}>Meu perfil</button>
            {gestao && <button role="menuitem" onClick={() => ir('/config')}>Configurações</button>}
            <button role="menuitem" className="danger" onClick={() => { setAberto(false); void signOut() }}>Sair</button>
          </div>
        </>
      )}
    </div>
  )
}

function Shell() {
  const { tenant, role } = useAuth()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const base = '/' + (loc.pathname.split('/').filter(Boolean)[0] || '')
  const titulo = TITLES[base] || TITLES[loc.pathname] || 'HOME'
  const can = (it: NavItem) => !it.roles || (role != null && it.roles.includes(role))

  useEffect(() => { setOpen(false) }, [loc.pathname])

  return (
    <div className="app">
      <LivingBg />
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <aside className={'side' + (open ? ' open' : '')}>
        <div className="brand">
          <span className="story-ring"><BrandLogo size={64} /></span>
          <div><div className="nm">{tenant?.nome || 'Ateliê'}</div><div className="tg">Ateliê Manager</div></div>
        </div>
        <nav className="nav">
          {NAV.filter(can).map((it, k) => it.g
            ? <div className="sep" key={'g' + k}>{it.g}</div>
            : <NavLink key={it.p} to={it.p!} end={it.p === '/'} className={({ isActive }) => (isActive ? 'on' : undefined)}><Ic d={it.i!} />{it.l}</NavLink>)}
        </nav>
      </aside>
      <div className="main">
        <div className="topbar">
          <button className="btn ghost menu-btn sm" aria-label="Abrir menu" onClick={() => setOpen(true)}><Ic d={I.menu} /></button>
          <h2>{titulo}</h2>
          <div className="spacer" />
          <UserMenu />
        </div>
        <div className="wrap">
          <Outlet />
          <div className="assinatura"><ByVizio /></div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Gate />}>
            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="ordens" element={<Ordens />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="servicos" element={<Servicos />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="fiscal" element={<Fiscal />} />
              <Route path="recuperacao" element={<Recuperacao />} />
              <Route path="alavancagem" element={<Alavancagem />} />
              <Route path="novidades" element={<Novidades />} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="config" element={<Config />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
