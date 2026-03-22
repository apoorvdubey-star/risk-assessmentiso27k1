import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Risk, calculateResultantRisk, getRiskLevel } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileDown, Pencil, CalendarIcon, Sparkles, Loader2, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function RiskTreatment() {
  const { risks, assets, settings, updateRisk } = useApp();
  const { canEdit } = useAuth();
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiRemarksLoading, setAiRemarksLoading] = useState(false);

  const treatable = useMemo(() => risks.filter(r => r.riskScore > settings.riskThreshold), [risks, settings]);
  const getAssetName = (id: string) => assets.find(a => a.id === id)?.assetName || 'Unknown';

  const handleAiRemarks = async () => {
    if (!editRisk || !editRisk.managementDecision) {
      toast.error("Select a Management Decision first");
      return;
    }
    setAiRemarksLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-treatment-remarks', {
        body: {
          managementDecision: editRisk.managementDecision,
          threat: editRisk.threat,
          vulnerability: editRisk.vulnerability,
          riskScenario: editRisk.riskScenario,
          consequence: editRisk.consequence,
          riskName: editRisk.riskName,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.remarks) {
        setEditRisk(p => p ? { ...p, remarks: data.remarks } : null);
        toast.success("AI treatment remarks applied");
      }
    } catch (err: any) {
      toast.error(err.message || "AI remarks failed");
    } finally {
      setAiRemarksLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editRisk) return;
    if (!editRisk.managementDecision) {
      toast.error("Management Decision is required");
      return;
    }
    if (!editRisk.expectedClosureDate) {
      toast.error("Expected Closure Date is required");
      return;
    }
    // Validate closure date >= created date
    const createdDate = editRisk.createdAt ? new Date(editRisk.createdAt) : new Date();
    const closureDate = new Date(editRisk.expectedClosureDate);
    if (closureDate < new Date(createdDate.toDateString())) {
      toast.error("Expected Closure Date cannot be before the Risk Identified date");
      return;
    }
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
      'Risk ID': r.riskId, Risk: r.riskName,
      Asset: getAssetName(r.linkedAssetId), Threat: r.threat, Vulnerability: r.vulnerability,
      'Risk Scenario': r.riskScenario, Consequence: r.consequence,
      RiskScore: r.riskScore, RiskLevel: r.riskLevel, Decision: r.managementDecision,
      ResidualRisk: r.resultantRisk, Status: r.status, Owner: r.riskOwner,
      Department: r.riskOwnerDepartment, ExpectedClosure: r.expectedClosureDate, Remarks: r.remarks,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Treatment Plan");
    XLSX.writeFile(wb, "risk_treatment_plan.xlsx");
  };

  return (
    <div className="p-6 split-panel h-full overflow-y-auto">
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
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary">{r.riskId}</span>
                      {r.riskName && <span className="font-medium text-sm">{r.riskName}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">Threat: {r.threat}</p>
                    <p className="text-xs text-muted-foreground">Vulnerability: {r.vulnerability}</p>
                    <p className="text-xs text-muted-foreground">Asset: {getAssetName(r.linkedAssetId)}</p>
                    <p className="text-xs text-muted-foreground">Scenario: {r.riskScenario || '—'}</p>
                    {r.consequence && <p className="text-xs text-muted-foreground">Consequence: {r.consequence}</p>}
                    <p className="text-xs text-muted-foreground">Owner: {r.riskOwner || '—'} {r.riskOwnerDepartment ? `(${r.riskOwnerDepartment})` : ''} | Decision: {r.managementDecision || 'Pending'}</p>
                    {r.remarks && <p className="text-xs text-muted-foreground italic">{r.remarks}</p>}
                  </div>
                  <div className="text-right space-y-1 ml-4">
                    <Badge className={`risk-badge-${r.riskLevel.toLowerCase()}`}>{r.riskLevel} ({r.riskScore})</Badge>
                    <p className="text-xs text-muted-foreground">Residual: {r.resultantRisk}</p>
                    <Badge variant="outline" className="text-xs">{r.status}</Badge>
                    {r.status === 'Closed' ? (
                      <Badge variant="secondary" className="mt-1 text-xs">🔒 Treated</Badge>
                    ) : canEdit ? (
                      <Button variant="outline" size="sm" className="mt-1 h-6 text-xs" onClick={() => setEditRisk({ ...r })}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    ) : null}
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
              <div className="p-2 rounded bg-muted text-xs space-y-1">
                <p><strong>Risk ID:</strong> {editRisk.riskId}</p>
                <p><strong>Risk:</strong> {editRisk.riskName || '—'}</p>
                <p><strong>Threat:</strong> {editRisk.threat}</p>
                <p><strong>Vulnerability:</strong> {editRisk.vulnerability}</p>
                {editRisk.riskScenario && <p><strong>Scenario:</strong> {editRisk.riskScenario}</p>}
                {editRisk.consequence && <p><strong>Consequence:</strong> {editRisk.consequence}</p>}
                <p><strong>Asset:</strong> {getAssetName(editRisk.linkedAssetId)}</p>
                <p><strong>Risk Score:</strong> {editRisk.riskScore} ({editRisk.riskLevel})</p>
                <p><strong>Risk Owner:</strong> {editRisk.riskOwner || '—'} {editRisk.riskOwnerDepartment ? `(${editRisk.riskOwnerDepartment})` : ''}</p>
                {editRisk.createdAt && <p><strong>Risk Identified:</strong> {format(new Date(editRisk.createdAt), 'PPP')}</p>}
              </div>
              <div>
                <Label className="text-xs">Management Decision *</Label>
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
                <Label className="text-xs">Expected Closure Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-sm",
                        !editRisk.expectedClosureDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {editRisk.expectedClosureDate ? format(parseISO(editRisk.expectedClosureDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editRisk.expectedClosureDate ? parseISO(editRisk.expectedClosureDate) : undefined}
                      onSelect={date => setEditRisk(p => p ? { ...p, expectedClosureDate: date ? format(date, 'yyyy-MM-dd') : '' } : null)}
                      disabled={date => {
                        const minDate = editRisk.createdAt ? new Date(new Date(editRisk.createdAt).toDateString()) : new Date(new Date().toDateString());
                        return date < minDate;
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Remarks</Label>
                  {(editRisk.managementDecision === 'Mitigate' || editRisk.managementDecision === 'Accept') && (
                    <Button type="button" variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={handleAiRemarks} disabled={aiRemarksLoading}>
                      {aiRemarksLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Suggest
                    </Button>
                  )}
                </div>
                <textarea
                  value={editRisk.remarks}
                  onChange={e => setEditRisk(p => p ? { ...p, remarks: e.target.value } : null)}
                  className="w-full h-20 text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Treatment plan details..."
                />
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
