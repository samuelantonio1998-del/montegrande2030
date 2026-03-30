import { AppSidebar } from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className={isMobile ? 'flex-1 px-4 py-4 pb-20' : 'ml-64 flex-1 p-8'}>
        {children}
      </main>
    </div>
  );
}
