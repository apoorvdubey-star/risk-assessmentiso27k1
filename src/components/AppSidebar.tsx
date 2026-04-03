import {
  LayoutDashboard, Server, AlertTriangle, ShieldCheck, BookOpen, FileText, Settings, Grid3X3, HelpCircle, Info, Wrench
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Asset Register", url: "/assets", icon: Server },
  { title: "Risk Assessment", url: "/risks", icon: AlertTriangle },
  { title: "Risk Treatment", url: "/treatment", icon: ShieldCheck },
  { title: "Controls Library", url: "/controls", icon: BookOpen },
  { title: "Reports & Monitoring", url: "/reports", icon: FileText },
  { title: "Risk Matrix", url: "/matrix", icon: Grid3X3 },
];

const bottomItems = [
  { title: "Configuration", url: "/configuration", icon: Wrench },
  { title: "FAQ", url: "/faq", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "About", url: "/about", icon: Info },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    supabase.from("tenants").select("name, logo_url").limit(1).single().then(({ data }) => {
      if (data) {
        setOrgName((data as any).name || "");
        const url = (data as any).logo_url;
        if (url) setLogoUrl(url);
      }
    });
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Help & Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 min-h-[40px]">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName || "Company Logo"}
              className="h-8 max-w-[140px] object-contain rounded"
            />
          ) : (
            !collapsed && orgName && (
              <span className="text-xs font-medium text-sidebar-foreground truncate">{orgName}</span>
            )
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
