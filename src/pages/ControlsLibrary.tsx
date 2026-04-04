import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Control {
  id: string;
  controlId: string;
  controlName: string;
  controlDescription: string;
  controlCategory: string;
}

const CATEGORIES = ['Organizational', 'People', 'Physical', 'Technological'] as const;
const CAT_COLORS: Record<string, string> = {
  Organizational: 'bg-primary/15 text-primary border-primary/30',
  People: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
  Physical: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  Technological: 'bg-accent text-accent-foreground border-border',
};

export default function ControlsLibrary() {
  const { isAdmin } = useAuth();
  const [controls, setControls] = useState<Control[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editControl, setEditControl] = useState<Control | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchControls = async () => {
    const { data } = await supabase.from('controls').select('*').order('control_id');
    if (data) {
      setControls(data.map(c => ({
        id: c.id,
        controlId: c.control_id,
        controlName: c.control_name,
        controlDescription: c.control_description,
        controlCategory: c.control_category,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchControls(); }, []);

  const handleSave = async () => {
    if (!editControl) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('controls').update({
        control_name: editControl.controlName,
        control_description: editControl.controlDescription,
        control_category: editControl.controlCategory as any,
      }).eq('id', editControl.id);
      if (error) throw error;
      await fetchControls();
      setEditControl(null);
      toast.success("Control updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('controls').delete().eq('id', id);
      if (error) throw error;
      await fetchControls();
      toast.info("Control deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const filtered = useMemo(() => {
    return controls.filter(c => {
      const matchSearch = !search || c.controlId.toLowerCase().includes(search.toLowerCase()) || c.controlName.toLowerCase().includes(search.toLowerCase()) || c.controlDescription.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'all' || c.controlCategory === category;
      return matchSearch && matchCat;
    });
  }, [controls, search, category]);

  const counts = useMemo(() => ({
    total: controls.length,
    ...Object.fromEntries(CATEGORIES.map(c => [c, controls.filter(ctrl => ctrl.controlCategory === c).length])),
  }), [controls]);

  if (loading) return <div className="p-6 text-muted-foreground">Loading controls...</div>;

  return (
    <div className="p-6 split-panel h-full">
      <h1 className="text-2xl font-bold mb-1">Controls Library</h1>
      <p className="text-sm text-muted-foreground mb-4">ISO 27001:2022 Annex A — {counts.total} controls</p>
      <div className="flex gap-2 mb-2 flex-wrap">
        {CATEGORIES.map(c => (
          <Badge key={c} variant="outline" className="text-xs">{c}: {counts[c as keyof typeof counts]}</Badge>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search controls..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">ID</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-48">Name</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">Category</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-primary">{c.controlId}</td>
                <td className="px-3 py-2 font-medium">{c.controlName}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.controlDescription}</td>
                <td className="px-3 py-2"><Badge className={`text-xs border ${CAT_COLORS[c.controlCategory]}`}>{c.controlCategory}</Badge></td>
                {isAdmin && (
                  <td className="px-3 py-2 flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditControl({ ...c })}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{filtered.length} controls shown</p>

      {/* Edit Control Dialog (Admin only) */}
      <Dialog open={!!editControl} onOpenChange={open => !open && setEditControl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Control</DialogTitle></DialogHeader>
          {editControl && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Control ID</Label>
                <Input value={editControl.controlId} disabled className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Control Name</Label>
                <Input value={editControl.controlName} onChange={e => setEditControl(p => p ? { ...p, controlName: e.target.value } : null)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={editControl.controlDescription} onChange={e => setEditControl(p => p ? { ...p, controlDescription: e.target.value } : null)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={editControl.controlCategory} onValueChange={v => setEditControl(p => p ? { ...p, controlCategory: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={() => setEditControl(null)} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
