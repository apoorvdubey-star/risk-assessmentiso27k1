import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQPage() {
  return (
    <div className="p-6 split-panel h-full max-w-3xl overflow-y-auto">
      <h1 className="text-2xl font-bold mb-4">Frequently Asked Questions</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">User Journey</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3 items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium text-foreground">Organization Setup</p>
                  <p>Admin configures the organization: name, industry, departments, and asset owners. This is a one-time setup that gates access for all users.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <div>
                  <p className="font-medium text-foreground">Settings Configuration</p>
                  <p>Configure data classification types, locations, risk matrix parameters (3×3 or 5×5), risk thresholds, and reduction percentages.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <div>
                  <p className="font-medium text-foreground">Asset Registration</p>
                  <p>Register information assets with CIA ratings (Confidentiality, Integrity, Availability). Assets with criticality score &gt; 8 are flagged as critical and require approval.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <div>
                  <p className="font-medium text-foreground">Risk Assessment</p>
                  <p>Assess risks for critical assets. AI generates multiple risk scenarios with threats, vulnerabilities, and consequences. Controls from ISO 27001 Annex A are mapped to each risk.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">5</span>
                <div>
                  <p className="font-medium text-foreground">Risk Treatment</p>
                  <p>Risks above the threshold require treatment plans. Select management decisions (Avoid, Mitigate, Transfer, Accept) and set closure dates. AI assists with treatment plan remarks.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">6</span>
                <div>
                  <p className="font-medium text-foreground">Monitoring & Reporting</p>
                  <p>Track risk status, generate reports, and monitor the overall risk posture through the dashboard and risk matrix visualization.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Risk Assessment Methodology</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="methodology">
                <AccordionTrigger className="text-sm">What methodology is used?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>This tool follows the <strong>ISO 27001:2022</strong> and <strong>ISO 27005</strong> risk assessment methodology. The approach involves:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Asset-based risk identification using CIA triad ratings</li>
                    <li>Criticality scoring: C × I × A (score &gt; 8 = Critical)</li>
                    <li>Risk scoring: Likelihood × Impact (1-25 scale)</li>
                    <li>Risk levels: Low (1-4), Medium (5-12), High (13-17), Critical (18-25)</li>
                    <li>Residual risk calculation with control effectiveness</li>
                    <li>Annex A control mapping for treatment</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="scales">
                <AccordionTrigger className="text-sm">What are the Likelihood and Impact scales?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">Likelihood Scale (1-5):</p>
                  <ul className="list-none space-y-0.5 ml-2">
                    <li><strong>1</strong> — Rare: May only occur in exceptional circumstances</li>
                    <li><strong>2</strong> — Unlikely: Could occur but not expected</li>
                    <li><strong>3</strong> — Possible: Might occur at some time</li>
                    <li><strong>4</strong> — Likely: Will probably occur</li>
                    <li><strong>5</strong> — Almost Certain: Expected to occur</li>
                  </ul>
                  <p className="font-medium mt-2">Impact Scale (1-5):</p>
                  <ul className="list-none space-y-0.5 ml-2">
                    <li><strong>1</strong> — Negligible: Minimal impact</li>
                    <li><strong>2</strong> — Minor: Limited impact, easily recoverable</li>
                    <li><strong>3</strong> — Moderate: Significant but manageable</li>
                    <li><strong>4</strong> — Major: Severe impact, difficult to recover</li>
                    <li><strong>5</strong> — Catastrophic: Business-threatening impact</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="controls">
                <AccordionTrigger className="text-sm">How are Annex A controls used?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>ISO 27001:2022 Annex A contains 93 controls across 4 categories: Organizational, People, Physical, and Technological. During risk assessment, relevant controls are mapped to each risk. AI assists in suggesting appropriate controls based on the identified threat and vulnerability. Control effectiveness (Effective, Not Effective, N/A) determines the residual risk calculation.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="roles">
                <AccordionTrigger className="text-sm">What are the user roles?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Admin:</strong> Full access — organization setup, user management, settings, all CRUD operations</li>
                    <li><strong>Risk Owner:</strong> Can manage assets and risks, approve criticality, delete assets/risks</li>
                    <li><strong>User:</strong> Read access with ability to add assets and risks, but cannot delete or modify settings</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="ai">
                <AccordionTrigger className="text-sm">How does AI assist in this tool?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>AI is integrated at several stages:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Asset Description:</strong> Generates descriptions and suggests data classification based on asset name and type</li>
                    <li><strong>Risk Scenarios:</strong> Generates 3-5 diverse risk scenarios for a critical asset with threats, vulnerabilities, and consequences</li>
                    <li><strong>Control Suggestion:</strong> Recommends relevant Annex A controls and assesses their effectiveness</li>
                    <li><strong>Treatment Remarks:</strong> Generates actionable treatment plan remarks based on the management decision</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
