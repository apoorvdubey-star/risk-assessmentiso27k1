import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();

  return (
    <div className="p-6 split-panel h-full max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Risk Matrix Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Matrix Type</Label>
              <Select value={settings.riskMatrixType} onValueChange={v => updateSettings({ riskMatrixType: v as '3x3' | '5x5' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3x3">3×3</SelectItem>
                  <SelectItem value="5x5">5×5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Risk Threshold (scores above this require treatment)</Label>
              <Input type="number" min={1} max={25} value={settings.riskThreshold} onChange={e => updateSettings({ riskThreshold: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Risk Reduction % (when controls are effective)</Label>
              <Input type="number" min={10} max={80} value={settings.riskReductionPercent} onChange={e => updateSettings({ riskReductionPercent: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Scale Definitions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <p className="font-medium">Likelihood Scale</p>
              {[['1','Rare – May only occur in exceptional circumstances'],['2','Unlikely – Could occur but not expected'],['3','Possible – Might occur at some time'],['4','Likely – Will probably occur'],['5','Almost Certain – Expected to occur']].map(([n,d]) => (
                <div key={n} className="flex gap-2"><span className="font-mono text-primary w-4">{n}</span><span className="text-muted-foreground">{d}</span></div>
              ))}
              <p className="font-medium mt-3">Impact Scale</p>
              {[['1','Negligible – Minimal impact'],['2','Minor – Limited impact, easily recoverable'],['3','Moderate – Significant but manageable'],['4','Major – Severe impact, difficult to recover'],['5','Catastrophic – Business-threatening impact']].map(([n,d]) => (
                <div key={n} className="flex gap-2"><span className="font-mono text-primary w-4">{n}</span><span className="text-muted-foreground">{d}</span></div>
              ))}
              <p className="font-medium mt-3">CIA Scale</p>
              {[['1','Negligible'],['2','Low'],['3','Moderate'],['4','High'],['5','Very High']].map(([n,d]) => (
                <div key={n} className="flex gap-2"><span className="font-mono text-primary w-4">{n}</span><span className="text-muted-foreground">{d}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
