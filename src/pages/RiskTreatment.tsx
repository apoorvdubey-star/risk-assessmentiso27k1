import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Risk, calculateResultantRisk, getRiskLevel } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function RiskTreatment() {
  const { risks, assets, settings, updateRisk } = useApp();
  const { canEdit } = useAuth();
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [saving, setSaving] = useState(false);

  const treatable = useMemo(() => risks.filter(r => r.riskScore > settings.riskThreshold), [risks, settings]);
  const getAssetName = (id: string) => assets.find(a => a.id === id)?.assetName || 'Unknown';

  const handleSave = async () => {
    if (!editRisk) return;
    if (editRisk.status === 'Closed' && !editRisk.managementDecision) {
      toast.error("Cannot close risk without a management decision");
      return;
    }
    setSaving(true);
    try {
      const riskScore = editRisk.likelihood * editRisk.impact;
      const resultantRisk = calculateResultantRisk(riskScore, editRisk.controlEffectiveness, settings.riskReductionPercent);
      await updateRisk({ ...editRisk, riskScore, riskLevel: getRiskLevel(riskScore), resultantRisk });
      setEditRisk(null);
      toast.success("Risk updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

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
                  <div className="space-y-1 flex-1">
                    <p className="font-medium text-sm">{r.threat}</p>
                    <p className="text-xs text-muted-foreground">Asset: {getAssetName(r.linkedAssetId)} | Vulnerability: {r.vulnerability}</p>
                    <p className="text-xs text-muted-foreground">Owner: {r.riskOwner || '—'} | Decision: {r.managementDecision || 'Pending'}</p>
                    {r.remarks && <p className="text-xs text-muted-foreground italic">{r.remarks}</p>}
                  </div>
                  <div className="text-right space-y-1 ml-4">
                    <Badge className={`risk-badge-${r.riskLevel.toLowerCase()}`}>{r.riskLevel} ({r.riskScore})</Badge>
                    <p className="text-xs text-muted-foreground">Residual: {r.resultantRisk}</p>
                    <Badge variant="outline" className="text-xs">{r.status}</Badge>
                    {canEdit && (
                      <Button variant="outline" size="sm" className="mt-1 h-6 text-xs" onClick={() => setEditRisk({ ...r })}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Risk Treatment Dialog */}
      <Dialog open={!!editRisk} onOpenChange={open => !open && setEditRisk(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Risk Treatment</DialogTitle></DialogHeader>
          {editRisk && (
            <div className="space-y-3">
              <div className="p-2 rounded bg-muted text-xs">
                <p><strong>Threat:</strong> {editRisk.threat}</p>
                <p><strong>Asset:</strong> {getAssetName(editRisk.linkedAssetId)}</p>
                <p><strong>Risk Score:</strong> {editRisk.riskScore} ({editRisk.riskLevel})</p>
              </div>
              <div>
                <Label className="text-xs">Management Decision</Label>
                <Select value={editRisk.managementDecision || 'none'} onValueChange={v => setEditRisk(p => p ? { ...p, managementDecision: v === 'none' ? '' : v as Risk['managementDecision'] } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    <SelectItem value="Avoid">Avoid</SelectItem>
                    <SelectItem value="Mitigate">Mitigate</SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                    <SelectItem value="Accept">Accept</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Control Effectiveness</Label>
                <Select value={editRisk.controlEffectiveness} onValueChange={v => setEditRisk(p => p ? { ...p, controlEffectiveness: v as Risk['controlEffectiveness'] } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Effective">Effective</SelectItem>
                    <SelectItem value="Not Effective">Not Effective</SelectItem>
                    <SelectItem value="NA">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={editRisk.status} onValueChange={v => setEditRisk(p => p ? { ...p, status: v as Risk['status'] } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="WIP">WIP</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Risk Owner</Label>
                <Input value={editRisk.riskOwner} onChange={e => setEditRisk(p => p ? { ...p, riskOwner: e.target.value } : null)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Expected Closure Date</Label>
                <Input type="date" value={editRisk.expectedClosureDate} onChange={e => setEditRisk(p => p ? { ...p, expectedClosureDate: e.target.value } : null)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Remarks</Label>
                <Input value={editRisk.remarks} onChange={e => setEditRisk(p => p ? { ...p, remarks: e.target.value } : null)} className="h-8 text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={() => setEditRisk(null)} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
