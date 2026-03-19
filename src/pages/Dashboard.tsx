import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const RISK_COLORS = {
  Low: "hsl(142, 71%, 45%)",
  Medium: "hsl(45, 93%, 47%)",
  High: "hsl(25, 95%, 53%)",
  Critical: "hsl(0, 84%, 60%)",
};

export default function Dashboard() {
  const { assets, risks } = useApp();
  const criticalAssets = assets.filter(a => a.isCritical);
  const risksByLevel = ['Low', 'Medium', 'High', 'Critical'].map(level => ({
    name: level,
    value: risks.filter(r => r.riskLevel === level).length,
  }));
  const openRisks = risks.filter(r => r.status === 'Open').length;
  const closedRisks = risks.filter(r => r.status === 'Closed').length;
  const highCritical = risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical');
  const statusData = [
    { name: 'Open', value: openRisks },
    { name: 'WIP', value: risks.filter(r => r.status === 'WIP').length },
    { name: 'Closed', value: closedRisks },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Server} label="Total Assets" value={assets.length} />
        <StatCard icon={ShieldAlert} label="Critical Assets" value={criticalAssets.length} accent />
        <StatCard icon={AlertTriangle} label="Open Risks" value={openRisks} />
        <StatCard icon={ShieldCheck} label="High/Critical Risks" value={highCritical.length} accent />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Risks by Level</CardTitle></CardHeader>
          <CardContent className="h-64">
            {risks.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={risksByLevel.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {risksByLevel.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Risk Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            {risks.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="name" stroke="hsl(215, 15%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(210, 100%, 56%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      {highCritical.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-risk-critical">⚠ Risks Requiring Immediate Action</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highCritical.filter(r => r.status === 'Open').slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-md bg-muted">
                  <span className="text-sm">{r.threat} — {r.riskScenario || r.vulnerability}</span>
                  <span className={`text-xs px-2 py-1 rounded-full risk-badge-${r.riskLevel.toLowerCase()}`}>{r.riskLevel} ({r.riskScore})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: boolean }) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`p-2 rounded-lg ${accent ? 'bg-risk-critical/15' : 'bg-primary/15'}`}>
          <Icon className={`h-5 w-5 ${accent ? 'text-risk-critical' : 'text-primary'}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data yet</div>;
}
