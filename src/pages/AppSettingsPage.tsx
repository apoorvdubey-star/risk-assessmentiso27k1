import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, Type, Upload, Trash2, PanelLeft, LayoutDashboard, Square, Monitor } from "lucide-react";

const FONT_FAMILIES = [
  { label: "System Default", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Source Sans Pro", value: "'Source Sans 3', sans-serif" },
  { label: "Nunito", value: "'Nunito', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Merriweather", value: "'Merriweather', serif" },
  { label: "Fira Code", value: "'Fira Code', monospace" },
];

interface PanelColorOption {
  label: string;
  key: string;
  color: string;
}

const SIDEBAR_COLORS: PanelColorOption[] = [
  { label: "Dark Navy", key: "sidebar-dark-navy", color: "220 20% 8%" },
  { label: "Deep Ocean", key: "sidebar-deep-ocean", color: "215 28% 7%" },
  { label: "Forest", key: "sidebar-forest", color: "160 20% 6%" },
  { label: "Charcoal", key: "sidebar-charcoal", color: "0 0% 8%" },
  { label: "Deep Purple", key: "sidebar-deep-purple", color: "270 18% 7%" },
  { label: "Warm Dark", key: "sidebar-warm-dark", color: "30 15% 7%" },
  { label: "Midnight Blue", key: "sidebar-midnight", color: "230 25% 6%" },
  { label: "Light Gray", key: "sidebar-light-gray", color: "220 15% 95%" },
];

const BACKGROUND_COLORS: PanelColorOption[] = [
  { label: "Dark Slate", key: "bg-dark-slate", color: "220 20% 10%" },
  { label: "Ocean Dark", key: "bg-ocean", color: "215 28% 10%" },
  { label: "Forest Dark", key: "bg-forest", color: "160 20% 9%" },
  { label: "Neutral Dark", key: "bg-neutral", color: "0 0% 10%" },
  { label: "Purple Dark", key: "bg-purple", color: "270 18% 10%" },
  { label: "Warm Dark", key: "bg-warm", color: "30 15% 10%" },
  { label: "Soft White", key: "bg-soft-white", color: "0 0% 98%" },
  { label: "Cool Gray", key: "bg-cool-gray", color: "220 10% 94%" },
];

const CARD_COLORS: PanelColorOption[] = [
  { label: "Dark Card", key: "card-dark", color: "220 18% 13%" },
  { label: "Ocean Card", key: "card-ocean", color: "215 25% 14%" },
  { label: "Forest Card", key: "card-forest", color: "160 18% 12%" },
  { label: "Neutral Card", key: "card-neutral", color: "0 0% 13%" },
  { label: "Purple Card", key: "card-purple", color: "270 16% 13%" },
  { label: "Warm Card", key: "card-warm", color: "30 14% 13%" },
  { label: "White Card", key: "card-white", color: "0 0% 100%" },
  { label: "Light Card", key: "card-light", color: "220 12% 96%" },
];

const PRIMARY_COLORS: PanelColorOption[] = [
  { label: "Blue", key: "primary-blue", color: "210 100% 56%" },
  { label: "Cyan", key: "primary-cyan", color: "200 90% 50%" },
  { label: "Green", key: "primary-green", color: "150 70% 45%" },
  { label: "Amber", key: "primary-amber", color: "35 90% 55%" },
  { label: "Purple", key: "primary-purple", color: "265 80% 60%" },
  { label: "Red", key: "primary-red", color: "0 80% 55%" },
  { label: "Teal", key: "primary-teal", color: "180 70% 40%" },
  { label: "Indigo", key: "primary-indigo", color: "240 70% 55%" },
];

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ACCEPTED_FORMATS = ".jpg,.jpeg,.png,.gif,.svg,.webp,.bmp,.ico";

interface PanelSettings {
  sidebar: string;
  background: string;
  card: string;
  primary: string;
}

function ColorPicker({ options, selected, onSelect, icon: Icon, title }: {
  options: PanelColorOption[];
  selected: string;
  onSelect: (color: string) => void;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {options.map(o => (
          <button
            key={o.key}
            onClick={() => onSelect(o.color)}
            className={`rounded-md border p-2 text-left text-[10px] transition-all ${
              selected === o.color
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-full h-5 rounded mb-1" style={{ background: `hsl(${o.color})` }} />
            <span className="truncate block">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AppSettingsPage() {
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [fontColor, setFontColor] = useState("");
  const [panelColors, setPanelColors] = useState<PanelSettings>({
    sidebar: "220 20% 8%",
    background: "220 20% 10%",
    card: "220 18% 13%",
    primary: "210 100% 56%",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("app-display-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.fontSize) setFontSize(s.fontSize);
        if (s.fontFamily) setFontFamily(s.fontFamily);
        if (s.fontColor) setFontColor(s.fontColor);
        if (s.panelColors) setPanelColors(s.panelColors);
      } catch {}
    }
    supabase.from("tenants").select("id, logo_url").limit(1).single().then(({ data }) => {
      if (data) {
        setTenantId(data.id);
        if ((data as any).logo_url) setLogoUrl((data as any).logo_url);
      }
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSize}px`;
    document.body.style.fontFamily = fontFamily;
    if (fontColor) {
      root.style.setProperty("--foreground", fontColor);
    }
    // Apply panel colors
    root.style.setProperty("--sidebar-background", panelColors.sidebar);
    root.style.setProperty("--background", panelColors.background);
    root.style.setProperty("--card", panelColors.card);
    root.style.setProperty("--primary", panelColors.primary);
    root.style.setProperty("--ring", panelColors.primary);
    root.style.setProperty("--sidebar-primary", panelColors.primary);

    localStorage.setItem("app-display-settings", JSON.stringify({ fontSize, fontFamily, fontColor, panelColors }));
  }, [fontSize, fontFamily, fontColor, panelColors]);

  const updatePanel = (key: keyof PanelSettings, color: string) => {
    setPanelColors(prev => ({ ...prev, [key]: color }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_LOGO_SIZE / 1024 / 1024}MB.`);
      return;
    }
    if (!tenantId) {
      toast.error("Tenant not found");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${tenantId}/logo.${ext}`;
      await supabase.storage.from("company-logos").remove([`${tenantId}/logo.jpg`, `${tenantId}/logo.png`, `${tenantId}/logo.svg`, `${tenantId}/logo.gif`, `${tenantId}/logo.webp`, `${tenantId}/logo.jpeg`, `${tenantId}/logo.bmp`, `${tenantId}/logo.ico`]);
      const { error: uploadError } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("company-logos").getPublicUrl(path);
      const url = publicUrl.publicUrl;
      const { error: updateError } = await supabase.from("tenants").update({ logo_url: url } as any).eq("id", tenantId);
      if (updateError) throw updateError;
      setLogoUrl(url);
      toast.success("Logo uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!tenantId) return;
    try {
      await supabase.storage.from("company-logos").remove([`${tenantId}/logo.jpg`, `${tenantId}/logo.png`, `${tenantId}/logo.svg`, `${tenantId}/logo.gif`, `${tenantId}/logo.webp`, `${tenantId}/logo.jpeg`]);
      await supabase.from("tenants").update({ logo_url: null } as any).eq("id", tenantId);
      setLogoUrl(null);
      toast.success("Logo removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove logo");
    }
  };

  const resetDefaults = () => {
    setFontSize(14);
    setFontFamily(FONT_FAMILIES[0].value);
    setFontColor("");
    setPanelColors({
      sidebar: "220 20% 8%",
      background: "220 20% 10%",
      card: "220 18% 13%",
      primary: "210 100% 56%",
    });
    document.documentElement.style.removeProperty("--foreground");
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="p-6 split-panel h-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        {/* Color Scheme - Separated panels */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> Color Scheme</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">Customize colors for each panel independently. Changes apply instantly.</p>

            <ColorPicker
              options={SIDEBAR_COLORS}
              selected={panelColors.sidebar}
              onSelect={c => updatePanel("sidebar", c)}
              icon={PanelLeft}
              title="Sidebar (Left Panel)"
            />

            <ColorPicker
              options={BACKGROUND_COLORS}
              selected={panelColors.background}
              onSelect={c => updatePanel("background", c)}
              icon={Monitor}
              title="Main Background (Right Panel)"
            />

            <ColorPicker
              options={CARD_COLORS}
              selected={panelColors.card}
              onSelect={c => updatePanel("card", c)}
              icon={Square}
              title="Cards & Panels"
            />

            <ColorPicker
              options={PRIMARY_COLORS}
              selected={panelColors.primary}
              onSelect={c => updatePanel("primary", c)}
              icon={LayoutDashboard}
              title="Accent / Primary Color"
            />
          </CardContent>
        </Card>

        {/* Font Settings */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Type className="h-4 w-4" /> Typography</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Font Family</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map(f => (
                    <SelectItem key={f.label} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Font Size: {fontSize}px</Label>
              <Slider
                min={10}
                max={20}
                step={1}
                value={[fontSize]}
                onValueChange={([v]) => setFontSize(v)}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>10px</span>
                <span>14px (default)</span>
                <span>20px</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Font Color (HSL values, e.g. "210 20% 90%")</Label>
              <Input
                value={fontColor}
                onChange={e => setFontColor(e.target.value)}
                placeholder="Leave empty to use scheme default"
                className="h-8 text-sm"
              />
              {fontColor && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded border" style={{ background: `hsl(${fontColor})` }} />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Logo */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Company Logo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Upload your company logo (JPG, PNG, SVG, GIF, WebP). Max size: 2MB.
            </p>
            <div className="rounded-md border border-dashed border-border p-3 bg-muted/30">
              <p className="text-xs font-medium mb-1">Recommended Dimensions</p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                <li>• <strong>Width:</strong> 140–180 px (fits the sidebar width)</li>
                <li>• <strong>Height:</strong> 32–40 px (fits the sidebar footer area)</li>
                <li>• <strong>Aspect ratio:</strong> Landscape / horizontal logos work best</li>
                <li>• <strong>Format:</strong> PNG or SVG with transparent background recommended</li>
                <li>• <strong>Max file size:</strong> 2 MB</li>
              </ul>
            </div>
            {logoUrl && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <img src={logoUrl} alt="Company Logo" className="h-12 max-w-[200px] object-contain rounded" />
                <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMATS}
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-3 w-3 mr-1" />
                {uploading ? "Uploading..." : logoUrl ? "Replace Logo" : "Upload Logo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reset */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
