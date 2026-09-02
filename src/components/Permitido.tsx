import type { ReactNode } from 'react';
import { usePermissao } from '@/hooks/usePermissao';

type PermitidoProps = {
  chave: string;
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renderiza os children apenas se o utilizador tiver a permissão indicada. */
export function Permitido({ chave, children, fallback = null }: PermitidoProps) {
  const { permitido, loading } = usePermissao(chave);
  if (loading || !permitido) return <>{fallback}</>;
  return <>{children}</>;
}

export default Permitido;
