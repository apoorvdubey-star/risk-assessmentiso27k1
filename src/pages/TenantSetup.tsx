import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantSetup({ onComplete }: { onComplete: () => void }) {
  const { user, createTenant } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);

  // Extract domain from user email
  const emailDomain = user?.email?.split('@')[1] || '';

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    setSaving(true);
    try {
      await createTenant(orgName.trim(), emailDomain, industry.trim());
      toast.success('Organization created!');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>Create Your Organization</CardTitle>
          <CardDescription>
            No matching organization found for <strong>{user?.email}</strong>.
            <br />Create one to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Organization Name *</Label>
            <Input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Acme Corporation"
            />
          </div>
          <div>
            <Label>Industry</Label>
            <Input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Financial Services, Healthcare"
            />
          </div>
          <div>
            <Label>Email Domain (auto-matched)</Label>
            <Input value={emailDomain} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">
              Future users with @{emailDomain} will auto-join this organization.
            </p>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Organization'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
