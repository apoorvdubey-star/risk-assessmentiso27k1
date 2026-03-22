import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Asset, calculateCriticality, isCriticalAsset } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Upload, Search, Plus, Pencil, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ASSET_TYPES = ['Hardware', 'Software', 'Service', 'People', 'Data', 'Others'] as const;
const DATA_CLASSIFICATIONS = ['Internal', 'Confidential', 'Restricted', 'Public'] as const;

const emptyForm = () => ({
  assetId: '', assetName: '', assetType: 'Hardware' as Asset['assetType'], dataClassification: '', description: '',
  assetOwner: '', department: '', location: '', confidentiality: 3, integrity: 3, availability: 3,
});

export default function AssetRegister() {
  const { assets, addAsset, updateAsset, deleteAsset, importAssets, approveAssetCriticality, loading } = useApp();
  const { isAdmin, isRiskOwner, canEdit, user } = useAuth();
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [orgDepartments, setOrgDepartments] = useState<string[]>([]);
  const [orgOwners, setOrgOwners] = useState<{ name: string; department: string }[]>([]);
  const [industry, setIndustry] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [defaultClassification, setDefaultClassification] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('departments').select('name').order('name'),
      supabase.from('asset_owners').select('name, departments(name)'),
      supabase.from('org_setup').select('*').limit(1).single(),
    ]).then(([deptRes, ownerRes, orgRes]) => {
      if (deptRes.data) setOrgDepartments(deptRes.data.map(d => d.name));
      if (ownerRes.data) setOrgOwners(ownerRes.data.map((o: any) => ({ name: o.name, department: (o.departments as any)?.name || '' })));
      if (orgRes.data) {
        setIndustry((orgRes.data as any).industry || '');
        const dc = (orgRes.data as any).default_data_classification || '';
        setDefaultClassification(dc);
        if (dc) setForm(p => ({ ...p, dataClassification: dc }));
      }
    });
  }, []);

  const departments = useMemo(() => {
    const fromAssets = assets.map(a => a.department).filter(Boolean);
    return [...new Set([...orgDepartments, ...fromAssets])];
  }, [assets, orgDepartments]);

  const availableOwners = useMemo(() => {
    const dept = form.department || (editAsset?.department);
    if (!dept) return orgOwners;
    return orgOwners.filter(o => o.department === dept);
  }, [form.department, editAsset?.department, orgOwners]);

  // Auto-set department when owner is selected (add form)
  useEffect(() => {
    if (!form.assetOwner) return;
    const owner = orgOwners.find(o => o.name === form.assetOwner);
    if (owner && owner.department && owner.department !== form.department) {
      setForm(p => ({ ...p, department: owner.department }));
    }
  }, [form.assetOwner, orgOwners]);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = !search || a.assetName.toLowerCase().includes(search.toLowerCase()) || a.assetId.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === 'all' || a.department === filterDept;
      return matchSearch && matchDept;
    });
  }, [assets, search, filterDept]);

  const handleAiDescribe = async () => {
    if (!form.assetName) { toast.error("Enter an asset name first"); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-asset-describe', {
        body: { assetName: form.assetName, assetType: form.assetType, industry },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setForm(p => ({
        ...p,
        description: data.description || p.description,
        dataClassification: data.suggestedClassification || p.dataClassification,
      }));
      toast.success("AI description applied");
    } catch (err: any) {
      toast.error(err.message || "AI description failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId || !form.assetName) { toast.error("Asset ID and Name are required"); return; }
    if (!form.location) { toast.error("Location is required"); return; }
    if (assets.some(a => a.assetId === form.assetId)) { toast.error("Asset ID already exists"); return; }
    setSubmitting(true);
    try {
      await addAsset(form);
      setForm({ ...emptyForm(), dataClassification: defaultClassification });
      toast.success("Asset added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add asset");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editAsset) return;
    setSubmitting(true);
    try {
      await updateAsset(editAsset);
      setEditAsset(null);
      toast.success("Asset updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update asset");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (asset: Asset) => {
    if (!user) return;
    try {
      await approveAssetCriticality(asset.id, user.id);
      toast.success("Criticality approved");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  };

  const canEditCIA = (asset: Asset) => {
    if (isAdmin) return true;
    if (asset.criticalityApproved) return false;
    return true;
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
        const imported = data.map((row) => {
          const c = Number(row['Confidentiality'] || row['confidentiality']) || 3;
          const i = Number(row['Integrity'] || row['integrity']) || 3;
          const a = Number(row['Availability'] || row['availability']) || 3;
          return {
            assetId: String(row['Asset ID'] || row['assetId'] || ''),
            assetName: String(row['Asset Name'] || row['assetName'] || row['Name'] || ''),
            assetType: (String(row['Asset Type'] || row['assetType'] || row['Type'] || 'Others')) as Asset['assetType'],
            dataClassification: String(row['Classification'] || row['dataClassification'] || defaultClassification || ''),
            description: String(row['Description'] || row['description'] || ''),
            assetOwner: String(row['Owner'] || row['assetOwner'] || ''),
            department: String(row['Department'] || row['department'] || ''),
            location: String(row['Location'] || row['location'] || ''),
            confidentiality: c, integrity: i, availability: a,
          };
        }).filter(a => a.assetId && a.assetName);
        await importAssets(imported);
        toast.success(`Imported ${imported.length} assets`);
      } catch { toast.error("Failed to parse Excel file"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(assets.map(({ id, criticalityApprovedBy, ...rest }) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");
    XLSX.writeFile(wb, "asset_register.xlsx");
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex h-full">
      <div className="w-96 border-r p-4 split-panel shrink-0">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Add Asset</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Asset ID" value={form.assetId} onChange={v => setForm(p => ({ ...p, assetId: v }))} required />
              <Field label="Asset Name" value={form.assetName} onChange={v => setForm(p => ({ ...p, assetName: v }))} required />
              
              {/* AI Description button */}
              <Button type="button" variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={handleAiDescribe} disabled={aiLoading || !form.assetName}>
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiLoading ? "Generating..." : "AI Generate Description"}
              </Button>

              <Field label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} />
              <div>
                <Label className="text-xs">Asset Type</Label>
                <Select value={form.assetType} onValueChange={v => setForm(p => ({ ...p, assetType: v as Asset['assetType'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data Classification</Label>
                <Select value={form.dataClassification || '_none'} onValueChange={v => setForm(p => ({ ...p, dataClassification: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select classification" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select...</SelectItem>
                    {DATA_CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Location" value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} required />
              <div>
                <Label className="text-xs">Owner</Label>
                <Select value={form.assetOwner || '_none'} onValueChange={v => setForm(p => ({ ...p, assetOwner: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select...</SelectItem>
                    {orgOwners.map(o => <SelectItem key={o.name} value={o.name}>{o.name} ({o.department})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <Select value={form.department || '_none'} onValueChange={v => setForm(p => ({ ...p, department: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select...</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="C" value={form.confidentiality} onChange={v => setForm(p => ({ ...p, confidentiality: v }))} />
                <NumberField label="I" value={form.integrity} onChange={v => setForm(p => ({ ...p, integrity: v }))} />
                <NumberField label="A" value={form.availability} onChange={v => setForm(p => ({ ...p, availability: v }))} />
              </div>
              <div className="text-xs text-muted-foreground">
                Criticality: {calculateCriticality(form.confidentiality, form.integrity, form.availability)}
                {isCriticalAsset(calculateCriticality(form.confidentiality, form.integrity, form.availability)) && (
                  <Badge className="ml-2 risk-badge-critical text-xs">Critical</Badge>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Adding...' : 'Add Asset'}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-3 w-3 mr-1" /> Import
          </Button>
          <input id="import-file" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" className="flex-1" onClick={exportToExcel}>Export</Button>
        </div>
      </div>
      <div className="flex-1 p-4 split-panel">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                {['ID', 'Name', 'Type', 'Location', 'Owner', 'Dept', 'C', 'I', 'A', 'Score', 'Critical', 'Approved', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-8 text-muted-foreground">No assets found</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono">{a.assetId}</td>
                  <td className="px-3 py-2">{a.assetName}</td>
                  <td className="px-3 py-2">{a.assetType}</td>
                  <td className="px-3 py-2">{a.location}</td>
                  <td className="px-3 py-2">{a.assetOwner}</td>
                  <td className="px-3 py-2">{a.department}</td>
                  <td className="px-3 py-2">{a.confidentiality}</td>
                  <td className="px-3 py-2">{a.integrity}</td>
                  <td className="px-3 py-2">{a.availability}</td>
                  <td className="px-3 py-2 font-bold">{a.criticalityScore}</td>
                  <td className="px-3 py-2">
                    {a.isCritical ? <Badge className="risk-badge-critical text-xs">Yes</Badge> : <Badge variant="outline" className="text-xs">No</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    {a.criticalityApproved ? (
                      <Badge className="bg-risk-low/15 text-risk-low border border-risk-low/30 text-xs">Approved</Badge>
                    ) : a.isCritical && (isAdmin || isRiskOwner) ? (
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => handleApprove(a)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 flex gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => setEditAsset({ ...a })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {(isAdmin || isRiskOwner) && (
                      <Button variant="ghost" size="sm" onClick={async () => { await deleteAsset(a.id); toast.info("Asset deleted"); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} of {assets.length} assets shown</p>
      </div>

      {/* Edit Asset Dialog */}
      <Dialog open={!!editAsset} onOpenChange={open => !open && setEditAsset(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Asset</DialogTitle></DialogHeader>
          {editAsset && (
            <div className="space-y-3">
              <Field label="Asset ID" value={editAsset.assetId} onChange={v => setEditAsset(p => p ? { ...p, assetId: v } : null)} />
              <Field label="Asset Name" value={editAsset.assetName} onChange={v => setEditAsset(p => p ? { ...p, assetName: v } : null)} />
              <Field label="Description" value={editAsset.description} onChange={v => setEditAsset(p => p ? { ...p, description: v } : null)} />
              <div>
                <Label className="text-xs">Asset Type</Label>
                <Select value={editAsset.assetType} onValueChange={v => setEditAsset(p => p ? { ...p, assetType: v as Asset['assetType'] } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data Classification</Label>
                <Select value={editAsset.dataClassification || '_none'} onValueChange={v => setEditAsset(p => p ? { ...p, dataClassification: v === '_none' ? '' : v } : null)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select...</SelectItem>
                    {DATA_CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Location" value={editAsset.location} onChange={v => setEditAsset(p => p ? { ...p, location: v } : null)} />
              <div>
                <Label className="text-xs">Owner</Label>
                <Select value={editAsset.assetOwner || '_none'} onValueChange={v => {
                  const ownerName = v === '_none' ? '' : v;
                  const owner = orgOwners.find(o => o.name === ownerName);
                  setEditAsset(p => p ? { ...p, assetOwner: ownerName, department: owner?.department || p.department } : null);
                }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select...</SelectItem>
                    {orgOwners.map(o => <SelectItem key={o.name} value={o.name}>{o.name} ({o.department})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Department" value={editAsset.department} onChange={v => setEditAsset(p => p ? { ...p, department: v } : null)} disabled />
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="C" value={editAsset.confidentiality} onChange={v => setEditAsset(p => p ? { ...p, confidentiality: v } : null)} disabled={!canEditCIA(editAsset)} />
                <NumberField label="I" value={editAsset.integrity} onChange={v => setEditAsset(p => p ? { ...p, integrity: v } : null)} disabled={!canEditCIA(editAsset)} />
                <NumberField label="A" value={editAsset.availability} onChange={v => setEditAsset(p => p ? { ...p, availability: v } : null)} disabled={!canEditCIA(editAsset)} />
              </div>
              {editAsset.criticalityApproved && !isAdmin && (
                <p className="text-xs text-risk-medium">⚠ CIA values are locked — criticality has been approved.</p>
              )}
              <div className="text-xs text-muted-foreground">
                Criticality: {calculateCriticality(editAsset.confidentiality, editAsset.integrity, editAsset.availability)}
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleEditSave} disabled={submitting} className="flex-1">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setEditAsset(null)} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, required, disabled }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}{required && ' *'}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} required={required} disabled={disabled} className="h-8 text-sm" />
    </div>
  );
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={1} max={5} value={value} onChange={e => onChange(Math.min(5, Math.max(1, Number(e.target.value))))} disabled={disabled} className="h-8 text-sm" />
    </div>
  );
}
