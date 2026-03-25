import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import DashboardSala from "./pages/DashboardSala";
import DashboardCozinha from "./pages/DashboardCozinha";
import DashboardGerencia from "./pages/DashboardGerencia";
import Checklist from "./pages/Checklist";
import Inventario from "./pages/Inventario";
import Ordens from "./pages/Ordens";
import FichasTecnicas from "./pages/FichasTecnicas";
import Mesas from "./pages/Mesas";
import Previsao from "./pages/Previsao";
import Producao from "./pages/Producao";
import Desperdicio from "./pages/Desperdicio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  switch (user.role) {
    case 'sala': return <DashboardSala />;
    case 'cozinha': return <DashboardCozinha />;
    case 'gerencia': return <DashboardGerencia />;
  }
}

function ProtectedRoutes() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/ordens" element={<Ordens />} />
        <Route path="/fichas-tecnicas" element={<FichasTecnicas />} />
        <Route path="/mesas" element={<Mesas />} />
        <Route path="/producao" element={<Producao />} />
        <Route path="/desperdicio" element={<Desperdicio />} />
        <Route path="/previsao" element={<Previsao />} />
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
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" />;
  return <Login />;
}

export default App;
