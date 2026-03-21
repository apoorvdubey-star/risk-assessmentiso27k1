import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth, AppRole } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  risk_owner: 'Risk Owner',
  user: 'User',
};

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setLoadingUsers(true);
      supabase.rpc('get_all_users').then(({ data, error }) => {
        if (data && !error) setUsers(data as UserRow[]);
        setLoadingUsers(false);
      });
    }
  }, [isAdmin]);

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('set_user_role', {
        _target_user_id: userId,
        _role: newRole,
      });
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("Role updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
  };

  return (
    <div className="p-6 split-panel h-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Risk Matrix Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Matrix Type</Label>
                <Select value={settings.riskMatrixType} onValueChange={v => updateSettings({ riskMatrixType: v as '3x3' | '5x5' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3x3">3×3</SelectItem>
                    <SelectItem value="5x5">5×5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Risk Threshold (scores above this require treatment)</Label>
                <Input type="number" min={1} max={25} value={settings.riskThreshold} onChange={e => updateSettings({ riskThreshold: Number(e.target.value) })} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Risk Reduction % (when controls are effective)</Label>
                <Input type="number" min={10} max={80} value={settings.riskReductionPercent} onChange={e => updateSettings({ riskReductionPercent: Number(e.target.value) })} className="h-8 text-sm" />
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader><CardTitle className="text-sm">User Management</CardTitle></CardHeader>
            <CardContent>
              {loadingUsers ? (
                <p className="text-sm text-muted-foreground">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found</p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Department</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b hover:bg-muted/30">
                          <td className="px-3 py-2">{u.email}</td>
                          <td className="px-3 py-2">{u.full_name}</td>
                          <td className="px-3 py-2">{u.department}</td>
                          <td className="px-3 py-2">
                            <Select value={u.role} onValueChange={v => changeRole(u.id, v)}>
                              <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="risk_owner">Risk Owner</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">Scale Definitions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <p className="font-medium">Likelihood Scale</p>
              {[['1','Rare – May only occur in exceptional circumstances'],['2','Unlikely – Could occur but not expected'],['3','Possible – Might occur at some time'],['4','Likely – Will probably occur'],['5','Almost Certain – Expected to occur']].map(([n,d]) => (
                <div key={n} className="flex gap-2"><span className="font-mono text-primary w-4">{n}</span><span className="text-muted-foreground">{d}</span></div>
              ))}
              <p className="font-medium mt-3">Impact Scale</p>
              {[['1','Negligible – Minimal impact'],['2','Minor – Limited impact, easily recoverable'],['3','Moderate – Significant but manageable'],['4','Major – Severe impact, difficult to recover'],['5','Catastrophic – Business-threatening impact']].map(([n,d]) => (
                <div key={n} className="flex gap-2"><span className="font-mono text-primary w-4">{n}</span><span className="text-muted-foreground">{d}</span></div>
              ))}
              <p className="font-medium mt-3">CIA Scale</p>
              {[['1','Negligible'],['2','Low'],['3','Moderate'],['4','High'],['5','Very High']].map(([n,d]) => (
                <div key={n} className="flex gap-2"><span className="font-mono text-primary w-4">{n}</span><span className="text-muted-foreground">{d}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
