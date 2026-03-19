import { useState, useMemo } from "react";
import { annexAControls } from "@/data/annex-a-controls";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const CATEGORIES = ['Organizational', 'People', 'Physical', 'Technological'] as const;
const CAT_COLORS: Record<string, string> = {
  Organizational: 'bg-primary/15 text-primary border-primary/30',
  People: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
  Physical: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  Technological: 'bg-accent text-accent-foreground border-border',
};

export default function ControlsLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    return annexAControls.filter(c => {
      const matchSearch = !search || c.controlId.toLowerCase().includes(search.toLowerCase()) || c.controlName.toLowerCase().includes(search.toLowerCase()) || c.controlDescription.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'all' || c.controlCategory === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  const counts = useMemo(() => ({
    total: annexAControls.length,
    ...Object.fromEntries(CATEGORIES.map(c => [c, annexAControls.filter(ctrl => ctrl.controlCategory === c).length])),
  }), []);

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
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.controlId} className="border-b hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-primary">{c.controlId}</td>
                <td className="px-3 py-2 font-medium">{c.controlName}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.controlDescription}</td>
                <td className="px-3 py-2"><Badge className={`text-xs border ${CAT_COLORS[c.controlCategory]}`}>{c.controlCategory}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{filtered.length} controls shown</p>
    </div>
  );
}
