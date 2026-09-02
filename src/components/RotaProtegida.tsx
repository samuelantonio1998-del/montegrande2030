import type { ReactNode } from 'react';
import { usePermissao } from '@/hooks/usePermissao';

type RotaProtegidaProps = {
  children: ReactNode;
  /** Chave de permissão exigida. Sem valor, a rota fica acessível a qualquer sessão. */
  permissao?: string;
};

export function RotaProtegida({ children, permissao }: RotaProtegidaProps) {
  const { permitido, loading } = usePermissao(permissao ?? '');

  if (!permissao) return <>{children}</>;
  if (loading) return null;
  if (!permitido) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="font-serif text-2xl text-foreground">Sem permissão</h1>
        <p className="text-sm text-muted-foreground">
          Não tem acesso a esta área. Contacte a gerência.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export default RotaProtegida;
