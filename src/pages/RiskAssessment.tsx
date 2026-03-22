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
import { Trash2, Search, Plus, AlertTriangle, Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface DbControl {
  controlId: string;
  controlName: string;
}

interface AssetOwnerInfo {
  name: string;
  department_name: string;
}

interface RiskScenario {
  threat: string;
  vulnerability: string;
  riskScenario: string;
  consequence: string;
  riskName: string;
  suggestedLikelihood: number;
  suggestedImpact: number;
  selected?: boolean;
}

const emptyRisk = () => ({
  linkedAssetId: '', threat: '', vulnerability: '', existingControlIds: [] as string[],
  controlEffectiveness: 'NA' as Risk['controlEffectiveness'], riskScenario: '', consequence: '',
  riskName: '', riskOwner: '', riskOwnerDepartment: '',
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
  const [aiControlLoading, setAiControlLoading] = useState(false);
  const [aiEffectivenessLoading, setAiEffectivenessLoading] = useState(false);
  const [industry, setIndustry] = useState('');
  const [assetOwners, setAssetOwners] = useState<AssetOwnerInfo[]>([]);
  const [aiScenarios, setAiScenarios] = useState<RiskScenario[]>([]);
  const [showScenarios, setShowScenarios] = useState(false);

  useEffect(() => {
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

  // Auto-set risk owner from asset owner when asset is selected
  useEffect(() => {
    if (!form.linkedAssetId) return;
    const asset = assets.find(a => a.id === form.linkedAssetId);
    if (!asset) return;
    // Set risk owner to asset owner and department
    setForm(p => ({
      ...p,
      riskOwner: asset.assetOwner || '',
      riskOwnerDepartment: asset.department || '',
    }));
  }, [form.linkedAssetId, assets]);

  const filteredControls = useMemo(() =>
    controls.filter(c =>
      c.controlId.toLowerCase().includes(controlSearch.toLowerCase()) ||
      c.controlName.toLowerCase().includes(controlSearch.toLowerCase())
    ).slice(0, 20),
    [controls, controlSearch]
  );

  const filtered = useMemo(() => {
    return risks.filter(r => {
      const matchSearch = !search || r.threat.toLowerCase().includes(search.toLowerCase()) || r.vulnerability.toLowerCase().includes(search.toLowerCase()) || r.riskId?.toLowerCase().includes(search.toLowerCase());
      const matchLevel = filterLevel === 'all' || r.riskLevel === filterLevel;
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchLevel && matchStatus;
    });
  }, [risks, search, filterLevel, filterStatus]);

  const handleAiMultiSuggest = async () => {
    if (!form.linkedAssetId) {
      toast.error("Select a critical asset first");
      return;
    }
    const asset = assets.find(a => a.id === form.linkedAssetId);
    if (!asset) return;

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-risk-multi-suggest', {
        body: {
          assetName: asset.assetName,
          assetType: asset.assetType,
          department: asset.department,
          threat: form.threat || '',
          industry,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const scenarios = (data.scenarios || []).map((s: any) => ({ ...s, selected: false }));
      setAiScenarios(scenarios);
      setShowScenarios(true);
      toast.success(`AI generated ${scenarios.length} risk scenarios`);
    } catch (err: any) {
      toast.error(err.message || "AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  const selectScenario = (index: number) => {
    const scenario = aiScenarios[index];
    setForm(p => ({
      ...p,
      threat: scenario.threat,
      vulnerability: scenario.vulnerability,
      riskScenario: scenario.riskScenario,
      consequence: scenario.consequence,
      riskName: scenario.riskName,
      likelihood: scenario.suggestedLikelihood,
      impact: scenario.suggestedImpact,
    }));
    setAiScenarios(prev => prev.map((s, i) => ({ ...s, selected: i === index })));
    setShowScenarios(false);
    toast.success("Scenario selected — you can edit the fields below");
  };

  const handleAiControlSuggest = async () => {
    if (!form.threat || !form.vulnerability) {
      toast.error("Enter threat and vulnerability first");
      return;
    }
    setAiControlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-control-suggest', {
        body: {
          threat: form.threat,
          vulnerability: form.vulnerability,
          industry,
          availableControlIds: controls.map(c => c.controlId),
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const suggestedIds: string[] = (data.controlIds || []).filter((id: string) =>
        controls.some(c => c.controlId === id)
      );
      setSelectedControls(suggestedIds);
      toast.success(`AI suggested ${suggestedIds.length} controls`);

      // Auto-assess effectiveness
      if (suggestedIds.length > 0) {
        setAiEffectivenessLoading(true);
        try {
          const { data: assessData, error: assessError } = await supabase.functions.invoke('ai-control-assess', {
            body: {
              threat: form.threat,
              vulnerability: form.vulnerability,
              controlIds: suggestedIds,
              industry,
            },
          });
          if (!assessError && assessData?.effectiveness) {
            setForm(p => ({ ...p, controlEffectiveness: assessData.effectiveness as Risk['controlEffectiveness'] }));
            toast.success(`Controls assessed as: ${assessData.effectiveness}`);
          }
        } catch { /* ignore assessment error */ }
        finally { setAiEffectivenessLoading(false); }
      }
    } catch (err: any) {
      toast.error(err.message || "AI control suggestion failed");
    } finally {
      setAiControlLoading(false);
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
      setAiScenarios([]);
      setShowScenarios(false);
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
      <div className="w-[420px] border-r p-4 split-panel shrink-0 overflow-y-auto">
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

              {/* AI Multi-suggest */}
              <Button
                type="button" variant="outline" size="sm" className="w-full text-xs gap-1.5"
                onClick={handleAiMultiSuggest} disabled={aiLoading || !form.linkedAssetId}
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiLoading ? "Generating scenarios..." : "AI Generate Risk Scenarios"}
              </Button>

              {/* AI Scenarios selection */}
              {showScenarios && aiScenarios.length > 0 && (
                <div className="border rounded p-2 space-y-2 bg-muted/30 max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground">Select a risk scenario:</p>
                  {aiScenarios.map((s, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded border cursor-pointer hover:bg-accent/50 text-xs transition-colors ${s.selected ? 'border-primary bg-primary/10' : ''}`}
                      onClick={() => selectScenario(i)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{s.riskName}</p>
                          <p className="text-muted-foreground mt-0.5">{s.threat}</p>
                        </div>
                        {s.selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div><Label className="text-xs">Risk Name</Label><Input value={form.riskName} onChange={e => setForm(p => ({ ...p, riskName: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Firewall Breach Risk" /></div>
              <div><Label className="text-xs">Threat *</Label><Input value={form.threat} onChange={e => setForm(p => ({ ...p, threat: e.target.value }))} className="h-8 text-sm" required /></div>
              <div><Label className="text-xs">Vulnerability *</Label><Input value={form.vulnerability} onChange={e => setForm(p => ({ ...p, vulnerability: e.target.value }))} className="h-8 text-sm" required /></div>
              <div><Label className="text-xs">Risk Scenario</Label><Input value={form.riskScenario} onChange={e => setForm(p => ({ ...p, riskScenario: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Consequence</Label><Input value={form.consequence} onChange={e => setForm(p => ({ ...p, consequence: e.target.value }))} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Risk Owner</Label><Input value={form.riskOwner} readOnly className="h-8 text-sm bg-muted" /></div>
              <div><Label className="text-xs">Department</Label><Input value={form.riskOwnerDepartment} readOnly className="h-8 text-sm bg-muted" /></div>
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
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Existing Controls (Annex A)</Label>
                  <Button
                    type="button" variant="outline" size="sm" className="h-6 text-xs gap-1"
                    onClick={handleAiControlSuggest}
                    disabled={aiControlLoading || !form.threat || !form.vulnerability}
                  >
                    {aiControlLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    AI Suggest
                  </Button>
                </div>
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
                <Label className="text-xs flex items-center gap-1">
                  Control Effectiveness
                  {aiEffectivenessLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                </Label>
                <Select value={form.controlEffectiveness} onValueChange={v => setForm(p => ({ ...p, controlEffectiveness: v as Risk['controlEffectiveness'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Effective">Effective</SelectItem>
                    <SelectItem value="Not Effective">Not Effective</SelectItem>
                    <SelectItem value="NA">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Remarks</Label><Input value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className="h-8 text-sm" /></div>
              <Button type="submit" className="w-full"><AlertTriangle className="h-3 w-3 mr-1" /> Add Risk</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="flex-1 p-4 split-panel overflow-y-auto">
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
                {['Risk ID', 'Risk', 'Asset', 'Threat', 'L', 'I', 'Score', 'Level', 'Owner', 'Status', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No risks found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`border-b hover:bg-muted/30 transition-colors ${r.status === 'Open' && (r.riskLevel === 'High' || r.riskLevel === 'Critical') ? 'bg-risk-critical/5' : ''}`}>
                  <td className="px-2 py-2 font-mono text-primary">{r.riskId}</td>
                  <td className="px-2 py-2 max-w-24 truncate" title={r.riskName}>{r.riskName || '—'}</td>
                  <td className="px-2 py-2">{getAssetName(r.linkedAssetId)}</td>
                  <td className="px-2 py-2 max-w-28 truncate">{r.threat}</td>
                  <td className="px-2 py-2">{r.likelihood}</td>
                  <td className="px-2 py-2">{r.impact}</td>
                  <td className="px-2 py-2 font-bold">{r.riskScore}</td>
                  <td className="px-2 py-2"><Badge className={`risk-badge-${r.riskLevel.toLowerCase()} text-xs`}>{r.riskLevel}</Badge></td>
                  <td className="px-2 py-2">{r.riskOwner || '—'}</td>
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
