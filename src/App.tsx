import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UnidadeProvider } from "@/contexts/UnidadeContext";
import { ProductionProvider } from "@/contexts/ProductionContext";
import { SidebarCollapseProvider } from "@/contexts/SidebarContext";
import { AppLayout } from "@/components/AppLayout";
import { RotaProtegida } from "@/components/RotaProtegida";
import { useMinhasPermissoes } from "@/hooks/usePermissao";
import { PERMISSOES } from "@/lib/permissoes";

import Login from "./pages/Login";
import DashboardSala from "./pages/DashboardSala";
import DashboardCozinha from "./pages/DashboardCozinha";
import DashboardGerencia from "./pages/DashboardGerencia";
import Tarefas from "./pages/Tarefas";
import Inventario from "./pages/Inventario";
import FichasTecnicas from "./pages/FichasTecnicas";
import Mesas from "./pages/Mesas";
import Previsao from "./pages/Previsao";
import Producao from "./pages/Producao";
import Desperdicio from "./pages/Desperdicio";
import Fornecedores from "./pages/Fornecedores";
import Precario from "./pages/Precario";
import Pessoas from "./pages/Pessoas";
import Definicoes from "./pages/Definicoes";


import Unsubscribe from "./pages/Unsubscribe";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DashboardRouter() {
  const { user } = useAuth();
  const { tem, loading } = useMinhasPermissoes();
  if (!user) return <Navigate to="/login" />;
  if (loading) return null;
  if (tem(PERMISSOES.pessoasGerir) || tem(PERMISSOES.inventarioGerir) || tem(PERMISSOES.unidadesGerir)) return <DashboardGerencia />;
  if (tem(PERMISSOES.producaoVer)) return <DashboardCozinha />;
  if (tem(PERMISSOES.mesasVer)) return <DashboardSala />;
  return <Navigate to="/tarefas" replace />;
}

const protegida = (permissao: string, pagina: ReactNode) => (
  <RotaProtegida permissao={permissao}>{pagina}</RotaProtegida>
);

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/tarefas" element={protegida(PERMISSOES.tarefasVer, <Tarefas />)} />
        <Route path="/inventario" element={protegida(PERMISSOES.inventarioVer, <Inventario />)} />
        <Route path="/fichas-tecnicas" element={protegida(PERMISSOES.fichasVer, <FichasTecnicas />)} />
        <Route path="/mesas" element={protegida(PERMISSOES.mesasVer, <Mesas />)} />
        <Route path="/producao" element={protegida(PERMISSOES.producaoVer, <Producao />)} />
        <Route path="/desperdicio" element={protegida(PERMISSOES.desperdicioVer, <Desperdicio />)} />
        <Route path="/fornecedores" element={protegida(PERMISSOES.fornecedoresVer, <Fornecedores />)} />
        <Route path="/precario" element={protegida(PERMISSOES.precarioVer, <Precario />)} />
        <Route
          path="/pessoas"
          element={
            <RotaProtegida permissao="gestao.funcionarios.gerir">
              <Pessoas />
            </RotaProtegida>
          }
        />
        <Route path="/funcionarios" element={<Navigate to="/pessoas" replace />} />
        <Route path="/gestao-utilizadores" element={<Navigate to="/pessoas" replace />} />
        <Route
          path="/definicoes"
          element={
            <RotaProtegida permissao="gestao.unidades.gerir">
              <Definicoes />
            </RotaProtegida>
          }
        />


        <Route path="/previsao" element={protegida(PERMISSOES.previsaoVer, <Previsao />)} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <UnidadeProvider>
        <ProductionProvider>
        <SidebarCollapseProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
        </SidebarCollapseProvider>
        </ProductionProvider>
        </UnidadeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" />;
  return <Login />;
}

export default App;
