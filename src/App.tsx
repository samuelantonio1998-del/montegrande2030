import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/ordens" element={<Ordens />} />
            <Route path="/fichas-tecnicas" element={<FichasTecnicas />} />
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/previsao" element={<Previsao />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
