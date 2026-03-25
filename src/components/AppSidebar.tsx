import { LayoutDashboard, ClipboardCheck, Package, MessageSquare } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/checklist', icon: ClipboardCheck, label: 'Checklist' },
  { to: '/inventario', icon: Package, label: 'Inventário' },
  { to: '/ordens', icon: MessageSquare, label: 'Ordens' },
];

export function AppSidebar() {
  const location = useLocation();

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
        {navItems.map((item) => {
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
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            G
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-accent-foreground">Gerente</p>
            <p className="text-xs text-sidebar-foreground/50">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
