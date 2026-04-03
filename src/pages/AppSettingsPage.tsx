import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, Type, Upload, Trash2 } from "lucide-react";

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

const COLOR_SCHEMES = [
  {
    label: "Default Dark",
    key: "default-dark",
    vars: {
      "--background": "220 20% 10%",
      "--foreground": "210 20% 90%",
      "--card": "220 18% 13%",
      "--primary": "210 100% 56%",
      "--sidebar-background": "220 20% 8%",
    },
  },
  {
    label: "Ocean Blue",
    key: "ocean-blue",
    vars: {
      "--background": "215 28% 10%",
      "--foreground": "210 25% 92%",
      "--card": "215 25% 14%",
      "--primary": "200 90% 50%",
      "--sidebar-background": "215 28% 7%",
    },
  },
  {
    label: "Forest Green",
    key: "forest-green",
    vars: {
      "--background": "160 20% 9%",
      "--foreground": "150 15% 90%",
      "--card": "160 18% 12%",
      "--primary": "150 70% 45%",
      "--sidebar-background": "160 20% 6%",
    },
  },
  {
    label: "Warm Amber",
    key: "warm-amber",
    vars: {
      "--background": "30 15% 10%",
      "--foreground": "35 20% 90%",
      "--card": "30 14% 13%",
      "--primary": "35 90% 55%",
      "--sidebar-background": "30 15% 7%",
    },
  },
  {
    label: "Purple Haze",
    key: "purple-haze",
    vars: {
      "--background": "270 18% 10%",
      "--foreground": "265 15% 90%",
      "--card": "270 16% 13%",
      "--primary": "265 80% 60%",
      "--sidebar-background": "270 18% 7%",
    },
  },
  {
    label: "Light Mode",
    key: "light-mode",
    vars: {
      "--background": "0 0% 98%",
      "--foreground": "220 15% 15%",
      "--card": "0 0% 100%",
      "--primary": "210 100% 50%",
      "--sidebar-background": "220 15% 95%",
    },
  },
];

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_FORMATS = ".jpg,.jpeg,.png,.gif,.svg,.webp,.bmp,.ico";

export default function AppSettingsPage() {
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [fontColor, setFontColor] = useState("");
  const [colorScheme, setColorScheme] = useState("default-dark");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("app-display-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.fontSize) setFontSize(s.fontSize);
        if (s.fontFamily) setFontFamily(s.fontFamily);
        if (s.fontColor) setFontColor(s.fontColor);
        if (s.colorScheme) setColorScheme(s.colorScheme);
      } catch {}
    }
    // Load tenant logo
    supabase.from("tenants").select("id, logo_url").limit(1).single().then(({ data }) => {
      if (data) {
        setTenantId(data.id);
        if ((data as any).logo_url) setLogoUrl((data as any).logo_url);
      }
    });
  }, []);

  // Apply settings live
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSize}px`;
    document.body.style.fontFamily = fontFamily;
    if (fontColor) {
      root.style.setProperty("--foreground", fontColor);
    }
    const scheme = COLOR_SCHEMES.find(s => s.key === colorScheme);
    if (scheme) {
      Object.entries(scheme.vars).forEach(([k, v]) => {
        root.style.setProperty(k, v);
      });
      if (!fontColor) {
        // Don't override custom font color
      }
    }
    // Persist
    localStorage.setItem("app-display-settings", JSON.stringify({ fontSize, fontFamily, fontColor, colorScheme }));
  }, [fontSize, fontFamily, fontColor, colorScheme]);

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
      // Delete old logo if exists
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
    setColorScheme("default-dark");
    document.documentElement.style.removeProperty("--foreground");
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="p-6 split-panel h-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        {/* Color Scheme */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> Color Scheme</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Choose a color scheme for all panels including sidebar, cards, and backgrounds.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLOR_SCHEMES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setColorScheme(s.key)}
                  className={`rounded-lg border p-3 text-left text-xs transition-all ${
                    colorScheme === s.key
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    {Object.values(s.vars).slice(0, 3).map((v, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ background: `hsl(${v})` }} />
                    ))}
                  </div>
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </div>
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
              Upload your company logo (JPG, PNG, SVG, GIF, WebP). Max size: 2MB. The logo will be displayed at the bottom of the sidebar.
            </p>
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