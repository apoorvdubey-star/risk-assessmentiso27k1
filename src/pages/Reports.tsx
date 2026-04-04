import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";


export default function Reports() {
  const { assets, risks, settings } = useApp();

  const exportRiskRegister = () => {
    const data = risks.map(r => {
      const asset = assets.find(a => a.id === r.linkedAssetId);
      return {
        Asset: asset?.assetName || '', AssetID: asset?.assetId || '', Threat: r.threat, Vulnerability: r.vulnerability,
        Scenario: r.riskScenario, Consequence: r.consequence, Likelihood: r.likelihood, Impact: r.impact,
        RiskScore: r.riskScore, RiskLevel: r.riskLevel, Controls: r.existingControlIds.join(', '),
        Effectiveness: r.controlEffectiveness, Decision: r.managementDecision,
        ResidualRisk: r.resultantRisk, Status: r.status, Owner: r.riskOwner, Remarks: r.remarks,
      };
    });
    download(data, "Risk Register", "risk_register.xlsx");
  };


  const exportAssetInventory = () => {
    download(assets.map(({ id, ...rest }) => rest), "Assets", "asset_inventory.xlsx");
  };

  const exportTreatmentPlan = () => {
    const data = risks.filter(r => r.riskScore > settings.riskThreshold).map(r => ({
      Asset: assets.find(a => a.id === r.linkedAssetId)?.assetName || '', Threat: r.threat,
      RiskScore: r.riskScore, Level: r.riskLevel, Decision: r.managementDecision,
      Residual: r.resultantRisk, Status: r.status, Owner: r.riskOwner,
    }));
    download(data, "Treatment Plan", "risk_treatment_plan.xlsx");
  };

  function download(data: Record<string, unknown>[], sheetName: string, fileName: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  }

  const reports = [
    { title: "Risk Register", desc: "Complete risk register with all assessments", action: exportRiskRegister, count: risks.length },
    { title: "Risk Treatment Plan", desc: "Risks requiring treatment (score > threshold)", action: exportTreatmentPlan, count: risks.filter(r => r.riskScore > settings.riskThreshold).length },
    { title: "Asset Inventory", desc: "Complete asset register with CIA ratings", action: exportAssetInventory, count: assets.length },
  ];

  return (
    <div className="p-6 split-panel h-full">
      <h1 className="text-2xl font-bold mb-4">Reports & Monitoring</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(r => (
          <Card key={r.title}>
            <CardHeader><CardTitle className="text-sm">{r.title}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
              <p className="text-xs text-muted-foreground mb-3">Records: {r.count}</p>
              <Button variant="outline" size="sm" onClick={r.action}><FileDown className="h-3 w-3 mr-1" /> Export to Excel</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
