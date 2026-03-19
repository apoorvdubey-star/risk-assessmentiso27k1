import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Asset, calculateCriticality, isCriticalAsset } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ASSET_TYPES = ['Hardware', 'Software', 'Service', 'People', 'Data', 'Others'] as const;

const emptyAsset = (): Omit<Asset, 'id' | 'criticalityScore' | 'isCritical'> => ({
  assetId: '', assetName: '', assetType: 'Hardware', dataClassification: '', description: '',
  assetOwner: '', department: '', confidentiality: 3, integrity: 3, availability: 3,
});

export default function AssetRegister() {
  const { assets, addAsset, deleteAsset, importAssets } = useApp();
  const [form, setForm] = useState(emptyAsset());
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  const departments = useMemo(() => [...new Set(assets.map(a => a.department).filter(Boolean))], [assets]);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = !search || a.assetName.toLowerCase().includes(search.toLowerCase()) || a.assetId.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === 'all' || a.department === filterDept;
      return matchSearch && matchDept;
    });
  }, [assets, search, filterDept]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId || !form.assetName) { toast.error("Asset ID and Name are required"); return; }
    if (assets.some(a => a.assetId === form.assetId)) { toast.error("Asset ID already exists"); return; }
    const score = calculateCriticality(form.confidentiality, form.integrity, form.availability);
    addAsset({ ...form, id: crypto.randomUUID(), criticalityScore: score, isCritical: isCriticalAsset(score) });
    setForm(emptyAsset());
    toast.success("Asset added");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
        const imported: Asset[] = data.map((row) => {
          const c = Number(row['Confidentiality'] || row['confidentiality']) || 3;
          const i = Number(row['Integrity'] || row['integrity']) || 3;
          const a = Number(row['Availability'] || row['availability']) || 3;
          const score = calculateCriticality(c, i, a);
          return {
            id: crypto.randomUUID(),
            assetId: String(row['Asset ID'] || row['assetId'] || ''),
            assetName: String(row['Asset Name'] || row['assetName'] || row['Name'] || ''),
            assetType: (String(row['Asset Type'] || row['assetType'] || row['Type'] || 'Others')) as Asset['assetType'],
            dataClassification: String(row['Classification'] || row['dataClassification'] || ''),
            description: String(row['Description'] || row['description'] || ''),
            assetOwner: String(row['Owner'] || row['assetOwner'] || ''),
            department: String(row['Department'] || row['department'] || ''),
            confidentiality: c, integrity: i, availability: a,
            criticalityScore: score, isCritical: isCriticalAsset(score),
          };
        }).filter(a => a.assetId && a.assetName);
        importAssets(imported);
        toast.success(`Imported ${imported.length} assets`);
      } catch { toast.error("Failed to parse Excel file"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(assets.map(({ id, ...rest }) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");
    XLSX.writeFile(wb, "asset_register.xlsx");
  };

  return (
    <div className="flex h-full">
      {/* LEFT: Form */}
      <div className="w-96 border-r p-4 split-panel shrink-0">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Add Asset</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Asset ID" value={form.assetId} onChange={v => setForm(p => ({ ...p, assetId: v }))} required />
              <Field label="Asset Name" value={form.assetName} onChange={v => setForm(p => ({ ...p, assetName: v }))} required />
              <div>
                <Label className="text-xs">Asset Type</Label>
                <Select value={form.assetType} onValueChange={v => setForm(p => ({ ...p, assetType: v as Asset['assetType'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label="Classification" value={form.dataClassification} onChange={v => setForm(p => ({ ...p, dataClassification: v }))} />
              <Field label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} />
              <Field label="Owner" value={form.assetOwner} onChange={v => setForm(p => ({ ...p, assetOwner: v }))} />
              <Field label="Department" value={form.department} onChange={v => setForm(p => ({ ...p, department: v }))} />
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
              <Button type="submit" className="w-full">Add Asset</Button>
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
      {/* RIGHT: Table */}
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
                {['ID', 'Name', 'Type', 'Owner', 'Dept', 'C', 'I', 'A', 'Score', 'Critical', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No assets found</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono">{a.assetId}</td>
                  <td className="px-3 py-2">{a.assetName}</td>
                  <td className="px-3 py-2">{a.assetType}</td>
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
                    <Button variant="ghost" size="sm" onClick={() => { deleteAsset(a.id); toast.info("Asset deleted"); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} of {assets.length} assets shown</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}{required && ' *'}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} required={required} className="h-8 text-sm" />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={1} max={5} value={value} onChange={e => onChange(Math.min(5, Math.max(1, Number(e.target.value))))} className="h-8 text-sm" />
    </div>
  );
}
