import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { Layout } from "@/components/Layout";
import Auth from "./pages/Auth";
import OrgSetup from "./pages/OrgSetup";
import Dashboard from "./pages/Dashboard";
import AssetRegister from "./pages/AssetRegister";
import RiskAssessment from "./pages/RiskAssessment";
import RiskTreatment from "./pages/RiskTreatment";
import ControlsLibrary from "./pages/ControlsLibrary";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";
import RiskMatrix from "./pages/RiskMatrix";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading, isAdmin } = useAuth();
  const [orgSetupDone, setOrgSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.from("org_setup").select("setup_completed").limit(1).single().then(({ data }) => {
      setOrgSetupDone(data?.setup_completed ?? false);
    });
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!session) return <Auth />;

  // Show org setup for admin if not completed
  if (orgSetupDone === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  if (!orgSetupDone && isAdmin) {
    return <OrgSetup onComplete={() => setOrgSetupDone(true)} />;
  }

  if (!orgSetupDone && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground p-4">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Setup Pending</h2>
          <p className="text-sm">Your administrator needs to complete the organization setup first.</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
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
    </AppProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
