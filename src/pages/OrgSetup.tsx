import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Plus, X, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface DepartmentForm {
  name: string;
  owners: { name: string; email: string }[];
}

export default function OrgSetup({ onComplete }: { onComplete: () => void }) {
  const { tenantId } = useAuth();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [departments, setDepartments] = useState<DepartmentForm[]>([{ name: "", owners: [{ name: "", email: "" }] }]);
  const [saving, setSaving] = useState(false);

  const addDepartment = () => setDepartments(prev => [...prev, { name: "", owners: [{ name: "", email: "" }] }]);

  const removeDepartment = (idx: number) => setDepartments(prev => prev.filter((_, i) => i !== idx));

  const updateDept = (idx: number, name: string) => {
    setDepartments(prev => prev.map((d, i) => i === idx ? { ...d, name } : d));
  };

  const addOwner = (deptIdx: number) => {
    setDepartments(prev => prev.map((d, i) => {
      if (i !== deptIdx || d.owners.length >= 2) return d;
      return { ...d, owners: [...d.owners, { name: "", email: "" }] };
    }));
  };

  const removeOwner = (deptIdx: number, ownerIdx: number) => {
    setDepartments(prev => prev.map((d, i) => {
      if (i !== deptIdx || d.owners.length <= 1) return d;
      return { ...d, owners: d.owners.filter((_, j) => j !== ownerIdx) };
    }));
  };

  const updateOwner = (deptIdx: number, ownerIdx: number, field: "name" | "email", value: string) => {
    setDepartments(prev => prev.map((d, i) => {
      if (i !== deptIdx) return d;
      return { ...d, owners: d.owners.map((o, j) => j === ownerIdx ? { ...o, [field]: value } : o) };
    }));
  };

  const handleSave = async () => {
    if (!orgName.trim()) { toast.error("Organization name is required"); return; }
    const validDepts = departments.filter(d => d.name.trim());
    if (validDepts.length === 0) { toast.error("Add at least one department"); return; }
    for (const d of validDepts) {
      const validOwners = d.owners.filter(o => o.name.trim() && o.email.trim());
      if (validOwners.length === 0) { toast.error(`Add at least one owner for ${d.name}`); return; }
    }

    setSaving(true);
    try {
      // Save org setup
      const { error: orgError } = await supabase.from("org_setup").insert({
        org_name: orgName.trim(),
        industry: industry.trim(),
        setup_completed: true,
      });
      if (orgError) throw orgError;

      // Save departments
      for (const dept of validDepts) {
        const { data: deptData, error: deptError } = await supabase.from("departments").insert({ name: dept.name.trim() }).select("id").single();
        if (deptError) throw deptError;

        // Save asset owners
        const validOwners = dept.owners.filter(o => o.name.trim() && o.email.trim());
        for (const owner of validOwners) {
          const { error: ownerError } = await supabase.from("asset_owners").insert({
            name: owner.name.trim(),
            email: owner.email.trim(),
            department_id: deptData.id,
          });
          if (ownerError) throw ownerError;
        }
      }

      toast.success("Organization setup complete!");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to save setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>Organization Setup</CardTitle>
          <CardDescription>One-time setup for your ISO 27001 risk management system</CardDescription>
          <div className="flex justify-center gap-2 mt-3">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-2 w-12 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium">Organization Details</h3>
              <div>
                <Label>Organization Name *</Label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corporation" />
              </div>
              <div>
                <Label>Industry</Label>
                <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Financial Services, Healthcare, IT" />
              </div>
              <Button className="w-full" onClick={() => { if (!orgName.trim()) { toast.error("Organization name required"); return; } setStep(2); }}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium">Departments for Risk Assessment</h3>
              <p className="text-sm text-muted-foreground">Add departments that will undergo risk assessment.</p>
              {departments.map((dept, dIdx) => (
                <div key={dIdx} className="border rounded-lg p-3 space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Department Name *</Label>
                      <Input value={dept.name} onChange={e => updateDept(dIdx, e.target.value)} placeholder="e.g. IT, Finance, HR" className="h-8 text-sm" />
                    </div>
                    {departments.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeDepartment(dIdx)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addDepartment} className="w-full">
                <Plus className="h-3 w-3 mr-1" /> Add Department
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={() => {
                  if (!departments.some(d => d.name.trim())) { toast.error("Add at least one department"); return; }
                  setStep(3);
                }}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium">Asset Owners / Risk Owners</h3>
              <p className="text-sm text-muted-foreground">Each department can have up to 2 asset owners (who are also risk owners).</p>
              {departments.filter(d => d.name.trim()).map((dept, dIdx) => (
                <div key={dIdx} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{dept.name}</Badge>
                    <span className="text-xs text-muted-foreground">({dept.owners.length}/2 owners)</span>
                  </div>
                  {dept.owners.map((owner, oIdx) => (
                    <div key={oIdx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Name *</Label>
                        <Input value={owner.name} onChange={e => updateOwner(dIdx, oIdx, "name", e.target.value)} placeholder="Full name" className="h-8 text-sm" />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Email *</Label>
                        <Input type="email" value={owner.email} onChange={e => updateOwner(dIdx, oIdx, "email", e.target.value)} placeholder="email@company.com" className="h-8 text-sm" />
                      </div>
                      {dept.owners.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeOwner(dIdx, oIdx)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {dept.owners.length < 2 && (
                    <Button variant="ghost" size="sm" onClick={() => addOwner(dIdx)} className="text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add Second Owner
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  <CheckCircle className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
