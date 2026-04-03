import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { Layout } from "@/components/Layout";
import Auth from "./pages/Auth";
import TenantSetup from "./pages/TenantSetup";
import OrgSetup from "./pages/OrgSetup";
import Dashboard from "./pages/Dashboard";
import AssetRegister from "./pages/AssetRegister";
import RiskAssessment from "./pages/RiskAssessment";
import RiskTreatment from "./pages/RiskTreatment";
import ControlsLibrary from "./pages/ControlsLibrary";
import Reports from "./pages/Reports";
import ConfigurationPage from "./pages/SettingsPage";
import AppSettingsPage from "./pages/AppSettingsPage";
import RiskMatrix from "./pages/RiskMatrix";
import FAQPage from "./pages/FAQPage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading, isAdmin, hasTenant, resolveTenant } = useAuth();
  const [orgSetupDone, setOrgSetupDone] = useState<boolean | null>(null);
  const [tenantReady, setTenantReady] = useState(false);

  // Re-check tenant after TenantSetup completes
  const handleTenantCreated = async () => {
    await resolveTenant();
    setTenantReady(true);
  };

  useEffect(() => {
    if (hasTenant) setTenantReady(true);
  }, [hasTenant]);

  useEffect(() => {
    if (!session || !tenantReady) return;
    supabase.from("org_setup").select("setup_completed").limit(1).single().then(({ data }) => {
      setOrgSetupDone(data?.setup_completed ?? false);
    });
  }, [session, tenantReady]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!session) return <Auth />;

  // User is logged in but has no tenant — show create/join flow
  if (!tenantReady) {
    return <TenantSetup onComplete={handleTenantCreated} />;
  }

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
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/about" element={<AboutPage />} />
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
