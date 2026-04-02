import { AppSidebar } from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarCollapse } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className={cn(
        'flex-1 transition-all duration-300',
        isMobile ? 'px-4 py-4 pb-20' : collapsed ? 'ml-16 p-8' : 'ml-64 p-8'
      )}>
        {children}
      </main>
    </div>
  );
}
