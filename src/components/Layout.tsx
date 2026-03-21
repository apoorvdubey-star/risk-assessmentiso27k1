import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  risk_owner: 'Risk Owner',
  user: 'User',
};

export function Layout({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 bg-card shrink-0">
            <SidebarTrigger className="mr-3" />
            <Shield className="h-5 w-5 text-primary mr-2" />
            <span className="font-semibold text-sm text-foreground">ISO 27001 Risk Management</span>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="outline" className="text-xs">{ROLE_LABELS[role] || role}</Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
