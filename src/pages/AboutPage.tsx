import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="p-6 split-panel h-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">About</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ISO 27001 Risk Assessment Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Version:</span>
              <Badge variant="secondary">1.0.0</Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                A comprehensive information security risk management tool aligned with 
                <strong> ISO 27001:2022</strong> and <strong>ISO 27005</strong> standards.
              </p>
              <p>
                This tool helps organizations identify, assess, and treat information security risks 
                through a structured methodology that includes asset registration, criticality assessment, 
                risk evaluation, and treatment planning.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Key Features</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Asset Register with CIA triad assessment and automatic criticality scoring</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>AI-powered risk scenario generation and control suggestion</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>ISO 27001:2022 Annex A control mapping (93 controls)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Configurable risk matrix (3×3 or 5×5) with customizable thresholds</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Risk treatment planning with AI-assisted remarks</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Role-based access control (Admin, Risk Owner, User)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Excel import/export for assets and treatment plans</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Dashboard with risk posture visualization</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Standards & Compliance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">ISO 27001:2022</Badge>
              <Badge variant="outline">ISO 27005</Badge>
              <Badge variant="outline">Annex A Controls</Badge>
              <Badge variant="outline">CIA Triad</Badge>
              <Badge variant="outline">Risk-Based Approach</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center pt-4">
          <p>Built with Lovable • Powered by AI</p>
          <p className="mt-1">© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
