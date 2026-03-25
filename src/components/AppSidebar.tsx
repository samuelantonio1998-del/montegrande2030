import { LayoutDashboard, ClipboardCheck, Package, MessageSquare, ChefHat, Grid3X3, TrendingUp, UtensilsCrossed, Trash2, LogOut } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

type NavItem = { to: string; icon: React.ElementType; label: string; roles: UserRole[] };

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/mesas', icon: Grid3X3, label: 'Mesas', roles: ['sala', 'gerencia'] },
  { to: '/checklist', icon: ClipboardCheck, label: 'Checklist', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/inventario', icon: Package, label: 'Inventário', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/producao', icon: UtensilsCrossed, label: 'Produção Buffet', roles: ['cozinha', 'gerencia'] },
  { to: '/fichas-tecnicas', icon: ChefHat, label: 'Fichas Técnicas', roles: ['cozinha', 'gerencia'] },
  { to: '/desperdicio', icon: Trash2, label: 'Desperdício', roles: ['gerencia'] },
  { to: '/previsao', icon: TrendingUp, label: 'Previsão', roles: ['sala', 'cozinha', 'gerencia'] },
  { to: '/ordens', icon: MessageSquare, label: 'Ordens', roles: ['gerencia'] },
];

const roleLabels: Record<UserRole, string> = {
  sala: 'Sala',
  cozinha: 'Cozinha',
  gerencia: 'Gerência',
};

export function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-sm font-bold text-sidebar-primary-foreground">R</span>
        </div>
        <div>
          <h1 className="text-base font-semibold text-sidebar-accent-foreground">RestoGest</h1>
          <p className="text-xs text-sidebar-foreground/60">Gestão Inteligente</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {user.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-sidebar-accent-foreground">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/50">{roleLabels[user.role]}</p>
            </div>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
