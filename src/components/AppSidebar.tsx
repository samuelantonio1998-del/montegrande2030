import { useState } from 'react';
import { LayoutDashboard, ClipboardCheck, Package, ChefHat, Grid3X3, TrendingUp, UtensilsCrossed, Trash2, LogOut, Building2, Menu, X, Euro, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarCollapse } from '@/contexts/SidebarContext';

type NavItem = { to: string; icon: React.ElementType; label: string; roles: UserRole[] };

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/mesas', icon: Grid3X3, label: 'Talão de Mesa', roles: ['sala', 'gerencia'] },
  { to: '/tarefas', icon: ClipboardCheck, label: 'Tarefas', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/inventario', icon: Package, label: 'Inventário', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/producao', icon: UtensilsCrossed, label: 'Produção Buffet', roles: ['cozinha', 'gerencia'] },
  { to: '/fichas-tecnicas', icon: ChefHat, label: 'Fichas Técnicas', roles: ['cozinha', 'gerencia'] },
  { to: '/desperdicio', icon: Trash2, label: 'Desperdício', roles: ['cozinha', 'gerencia'] },
  { to: '/previsao', icon: TrendingUp, label: 'Previsão', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/fornecedores', icon: Building2, label: 'Fornecedores', roles: ['gerencia'] },
  
  { to: '/precario', icon: Euro, label: 'Preçário', roles: ['gerencia'] },
  { to: '/funcionarios', icon: Users, label: 'Funcionários', roles: ['gerencia'] },
];

const roleLabels: Record<UserRole, string> = {
  sala: 'Sala',
  cozinha: 'Cozinha',
  gerencia: 'Gerência',
};

export function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  // Mobile: bottom tab bar (first 4 items) + "more" menu
  if (isMobile) {
    const bottomTabs = filteredNav.slice(0, 4);
    const moreItems = filteredNav.slice(4);

    return (
      <>
        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-sidebar-border bg-sidebar safe-bottom">
          {bottomTabs.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-sidebar-primary'
                    : 'text-sidebar-foreground/60'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </NavLink>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              mobileOpen ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'
            )}
          >
            <Menu className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </nav>

        {/* Slide-up drawer */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-sidebar text-sidebar-foreground animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                    {user.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-sidebar-accent-foreground">{user.name}</p>
                    <p className="text-xs text-sidebar-foreground/50">{roleLabels[user.role]}</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="px-3 py-3 space-y-1">
                {moreItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="border-t border-sidebar-border px-3 py-3">
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Terminar Sessão
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop: classic sidebar with collapse
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      onClick={() => collapsed && setCollapsed(false)}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border overflow-hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-sm font-bold text-sidebar-primary-foreground">R</span>
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-base font-semibold text-sidebar-accent-foreground">RestoGest</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão Inteligente</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (collapsed) {
                  e.stopPropagation();
                }
                setCollapsed(true);
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {user.name[0]}
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-medium text-sidebar-accent-foreground">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/50">{roleLabels[user.role]}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={logout} className="rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export function useSidebarCollapsed() {
  return false; // placeholder for layout
}
