import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Risk, calculateRiskScore, getRiskLevel, calculateResultantRisk } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Search, Plus, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DbControl {
  controlId: string;
  controlName: string;
}

interface AssetOwnerInfo {
  name: string;
  department_name: string;
}

const emptyRisk = () => ({
  linkedAssetId: '', threat: '', vulnerability: '', existingControlIds: [] as string[],
  controlEffectiveness: 'NA' as Risk['controlEffectiveness'], riskScenario: '', consequence: '', riskOwner: '',
  likelihood: 3, impact: 3, managementDecision: '' as Risk['managementDecision'],
  status: 'Open' as const, expectedClosureDate: '', remarks: '',
  riskLevel: 'Medium' as const, resultantRisk: 0,
});

export default function RiskAssessment() {
  const { assets, risks, addRisk, deleteRisk, settings } = useApp();
  const criticalAssets = useMemo(() => assets.filter(a => a.isCritical), [assets]);
  const [form, setForm] = useState(emptyRisk());
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [controlSearch, setControlSearch] = useState('');
  const [controls, setControls] = useState<DbControl[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [industry, setIndustry] = useState('');
  const [assetOwners, setAssetOwners] = useState<AssetOwnerInfo[]>([]);

  useEffect(() => {
    // Load controls, org industry, and asset owners
    Promise.all([
      supabase.from('controls').select('control_id, control_name').order('control_id'),
      supabase.from('org_setup').select('industry').limit(1).single(),
      supabase.from('asset_owners').select('name, departments(name)'),
    ]).then(([controlsRes, orgRes, ownersRes]) => {
      if (controlsRes.data) setControls(controlsRes.data.map(c => ({ controlId: c.control_id, controlName: c.control_name })));
      if (orgRes.data) setIndustry(orgRes.data.industry || '');
      if (ownersRes.data) {
        setAssetOwners(ownersRes.data.map((o: any) => ({
          name: o.name,
          department_name: o.departments?.name || '',
        })));
      }
    });
  }, []);

  // Auto-set risk owner from asset owners when asset is selected
  useEffect(() => {
    if (!form.linkedAssetId) return;
    const asset = assets.find(a => a.id === form.linkedAssetId);
    if (!asset) return;
    // Find owner for this asset's department
    const owner = assetOwners.find(o => o.department_name === asset.department);
    if (owner) {
      setForm(p => ({ ...p, riskOwner: owner.name }));
    }
  }, [form.linkedAssetId, assets, assetOwners]);

  const filteredControls = useMemo(() =>
    controls.filter(c =>
      c.controlId.toLowerCase().includes(controlSearch.toLowerCase()) ||
      c.controlName.toLowerCase().includes(controlSearch.toLowerCase())
    ).slice(0, 20),
    [controls, controlSearch]
  );

  const filtered = useMemo(() => {
    return risks.filter(r => {
      const matchSearch = !search || r.threat.toLowerCase().includes(search.toLowerCase()) || r.vulnerability.toLowerCase().includes(search.toLowerCase());
      const matchLevel = filterLevel === 'all' || r.riskLevel === filterLevel;
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchLevel && matchStatus;
    });
  }, [risks, search, filterLevel, filterStatus]);

  const handleAiSuggest = async () => {
    if (!form.linkedAssetId || !form.threat) {
      toast.error("Select an asset and enter a threat first");
      return;
    }
    const asset = assets.find(a => a.id === form.linkedAssetId);
    if (!asset) return;

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-risk-suggest', {
        body: {
          assetName: asset.assetName,
          assetType: asset.assetType,
          department: asset.department,
          threat: form.threat,
          industry,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setForm(p => ({
        ...p,
        vulnerability: data.vulnerability || p.vulnerability,
        consequence: data.consequence || p.consequence,
        riskScenario: data.riskScenario || p.riskScenario,
        likelihood: data.suggestedLikelihood || p.likelihood,
        impact: data.suggestedImpact || p.impact,
      }));
      toast.success("AI suggestions applied");
    } catch (err: any) {
      toast.error(err.message || "AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.linkedAssetId) { toast.error("Select a critical asset"); return; }
    if (!form.threat || !form.vulnerability) { toast.error("Threat and Vulnerability are required"); return; }
    const riskScore = calculateRiskScore(form.likelihood, form.impact);
    const riskLevel = getRiskLevel(riskScore);
    const resultantRisk = calculateResultantRisk(riskScore, form.controlEffectiveness, settings.riskReductionPercent);
    try {
      await addRisk({
        ...form, existingControlIds: selectedControls,
        riskLevel, resultantRisk,
      });
      setForm(emptyRisk());
      setSelectedControls([]);
      toast.success("Risk added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add risk");
    }
  };

  const toggleControl = (id: string) => {
    setSelectedControls(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const getAssetName = (id: string) => assets.find(a => a.id === id)?.assetName || 'Unknown';

  const previewScore = calculateRiskScore(form.likelihood, form.impact);
  const previewLevel = getRiskLevel(previewScore);

  return (
    <div className="flex h-full">
      <div className="w-[420px] border-r p-4 split-panel shrink-0">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Add Risk</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Critical Asset *</Label>
                <Select value={form.linkedAssetId} onValueChange={v => setForm(p => ({ ...p, linkedAssetId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select critical asset" /></SelectTrigger>
                  <SelectContent>
                    {criticalAssets.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground">No critical assets. Add assets with criticality &gt; 8 first.</div>
                    ) : criticalAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.assetId} - {a.assetName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Threat *</Label><Input value={form.threat} onChange={e => setForm(p => ({ ...p, threat: e.target.value }))} className="h-8 text-sm" required /></div>
              
              {/* AI Auto-populate button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={handleAiSuggest}
                disabled={aiLoading || !form.linkedAssetId || !form.threat}
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiLoading ? "Generating suggestions..." : "AI Auto-populate"}
              </Button>

              <div><Label className="text-xs">Vulnerability *</Label><Input value={form.vulnerability} onChange={e => setForm(p => ({ ...p, vulnerability: e.target.value }))} className="h-8 text-sm" required /></div>
              <div><Label className="text-xs">Risk Scenario</Label><Input value={form.riskScenario} onChange={e => setForm(p => ({ ...p, riskScenario: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Consequence</Label><Input value={form.consequence} onChange={e => setForm(p => ({ ...p, consequence: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Risk Owner</Label><Input value={form.riskOwner} onChange={e => setForm(p => ({ ...p, riskOwner: e.target.value }))} className="h-8 text-sm" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Likelihood (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.likelihood} onChange={e => setForm(p => ({ ...p, likelihood: Math.min(5, Math.max(1, Number(e.target.value))) }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Impact (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.impact} onChange={e => setForm(p => ({ ...p, impact: Math.min(5, Math.max(1, Number(e.target.value))) }))} className="h-8 text-sm" />
                </div>
              </div>
              <div className="p-2 rounded bg-muted text-xs">
                Risk Score: <span className="font-bold">{previewScore}</span> — Level: <span className={`font-bold risk-badge-${previewLevel.toLowerCase()} px-1 rounded`}>{previewLevel}</span>
                {previewScore > settings.riskThreshold && <span className="text-risk-critical ml-1">⚠ Treatment Required</span>}
              </div>
              <div>
                <Label className="text-xs">Existing Controls (Annex A)</Label>
                <Input placeholder="Search controls..." value={controlSearch} onChange={e => setControlSearch(e.target.value)} className="h-8 text-sm mb-1" />
                <div className="max-h-32 overflow-y-auto border rounded p-1 space-y-0.5">
                  {filteredControls.map(c => (
                    <label key={c.controlId} className="flex items-center gap-1.5 text-xs p-1 hover:bg-muted rounded cursor-pointer">
                      <input type="checkbox" checked={selectedControls.includes(c.controlId)} onChange={() => toggleControl(c.controlId)} className="rounded" />
                      <span className="font-mono text-muted-foreground">{c.controlId}</span>
                      <span className="truncate">{c.controlName}</span>
                    </label>
                  ))}
                </div>
                {selectedControls.length > 0 && <p className="text-xs text-muted-foreground mt-1">{selectedControls.length} controls selected</p>}
              </div>
              <div>
                <Label className="text-xs">Control Effectiveness</Label>
                <Select value={form.controlEffectiveness} onValueChange={v => setForm(p => ({ ...p, controlEffectiveness: v as Risk['controlEffectiveness'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Effective">Effective</SelectItem>
                    <SelectItem value="Not Effective">Not Effective</SelectItem>
                    <SelectItem value="NA">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Management Decision</Label>
                <Select value={form.managementDecision || 'none'} onValueChange={v => setForm(p => ({ ...p, managementDecision: v === 'none' ? '' : v as Risk['managementDecision'] }))}>
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
              <div><Label className="text-xs">Remarks</Label><Input value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className="h-8 text-sm" /></div>
              <Button type="submit" className="w-full"><AlertTriangle className="h-3 w-3 mr-1" /> Add Risk</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="flex-1 p-4 split-panel">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search risks..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {['Low','Medium','High','Critical'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {['Open','WIP','Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                {['Asset', 'Threat', 'Vulnerability', 'L', 'I', 'Score', 'Level', 'Decision', 'Residual', 'Status', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No risks found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`border-b hover:bg-muted/30 transition-colors ${r.status === 'Open' && (r.riskLevel === 'High' || r.riskLevel === 'Critical') ? 'bg-risk-critical/5' : ''}`}>
                  <td className="px-2 py-2">{getAssetName(r.linkedAssetId)}</td>
                  <td className="px-2 py-2 max-w-32 truncate">{r.threat}</td>
                  <td className="px-2 py-2 max-w-32 truncate">{r.vulnerability}</td>
                  <td className="px-2 py-2">{r.likelihood}</td>
                  <td className="px-2 py-2">{r.impact}</td>
                  <td className="px-2 py-2 font-bold">{r.riskScore}</td>
                  <td className="px-2 py-2"><Badge className={`risk-badge-${r.riskLevel.toLowerCase()} text-xs`}>{r.riskLevel}</Badge></td>
                  <td className="px-2 py-2">{r.managementDecision || '—'}</td>
                  <td className="px-2 py-2">{r.resultantRisk}</td>
                  <td className="px-2 py-2"><Badge variant="outline" className="text-xs">{r.status}</Badge></td>
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="sm" onClick={async () => { await deleteRisk(r.id); toast.info("Risk deleted"); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} of {risks.length} risks shown</p>
      </div>
    </div>
  );
}
