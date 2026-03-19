import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default function RiskTreatment() {
  const { risks, assets, settings } = useApp();
  const treatable = useMemo(() => risks.filter(r => r.riskScore > settings.riskThreshold), [risks, settings]);
  const getAssetName = (id: string) => assets.find(a => a.id === id)?.assetName || 'Unknown';

  const exportPlan = () => {
    const ws = XLSX.utils.json_to_sheet(treatable.map(r => ({
      Asset: getAssetName(r.linkedAssetId), Threat: r.threat, Vulnerability: r.vulnerability,
      RiskScore: r.riskScore, RiskLevel: r.riskLevel, Decision: r.managementDecision,
      ResidualRisk: r.resultantRisk, Status: r.status, Owner: r.riskOwner,
      ExpectedClosure: r.expectedClosureDate, Remarks: r.remarks,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Treatment Plan");
    XLSX.writeFile(wb, "risk_treatment_plan.xlsx");
  };

  return (
    <div className="p-6 split-panel h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Risk Treatment Plan</h1>
        <Button variant="outline" size="sm" onClick={exportPlan}><FileDown className="h-3 w-3 mr-1" /> Export</Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Risks with score above threshold ({settings.riskThreshold}) requiring treatment.</p>
      {treatable.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No risks above threshold</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {treatable.map(r => (
            <Card key={r.id} className="border-l-4" style={{ borderLeftColor: r.riskLevel === 'Critical' ? 'hsl(0,84%,60%)' : r.riskLevel === 'High' ? 'hsl(25,95%,53%)' : 'hsl(45,93%,47%)' }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{r.threat}</p>
                    <p className="text-xs text-muted-foreground">Asset: {getAssetName(r.linkedAssetId)} | Vulnerability: {r.vulnerability}</p>
                    <p className="text-xs text-muted-foreground">Owner: {r.riskOwner || '—'} | Decision: {r.managementDecision || 'Pending'}</p>
                    {r.remarks && <p className="text-xs text-muted-foreground italic">{r.remarks}</p>}
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={`risk-badge-${r.riskLevel.toLowerCase()}`}>{r.riskLevel} ({r.riskScore})</Badge>
                    <p className="text-xs text-muted-foreground">Residual: {r.resultantRisk}</p>
                    <Badge variant="outline" className="text-xs">{r.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
