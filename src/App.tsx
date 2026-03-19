import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import AssetRegister from "./pages/AssetRegister";
import RiskAssessment from "./pages/RiskAssessment";
import RiskTreatment from "./pages/RiskTreatment";
import ControlsLibrary from "./pages/ControlsLibrary";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";
import RiskMatrix from "./pages/RiskMatrix";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<AssetRegister />} />
              <Route path="/risks" element={<RiskAssessment />} />
              <Route path="/treatment" element={<RiskTreatment />} />
              <Route path="/controls" element={<ControlsLibrary />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/matrix" element={<RiskMatrix />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
