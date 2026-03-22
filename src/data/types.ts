export interface Asset {
  id: string;
  assetId: string;
  assetName: string;
  assetType: 'Hardware' | 'Software' | 'Service' | 'People' | 'Data' | 'Others';
  dataClassification: string;
  description: string;
  assetOwner: string;
  department: string;
  location: string;
  confidentiality: number;
  integrity: number;
  availability: number;
  criticalityScore: number;
  isCritical: boolean;
  criticalityApproved: boolean;
  criticalityApprovedBy: string | null;
}

export interface Risk {
  id: string;
  riskId: string;
  linkedAssetId: string;
  threat: string;
  vulnerability: string;
  existingControlIds: string[];
  controlEffectiveness: 'Effective' | 'Not Effective' | 'NA';
  riskScenario: string;
  consequence: string;
  riskName: string;
  riskOwner: string;
  riskOwnerDepartment: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  managementDecision: 'Avoid' | 'Mitigate' | 'Transfer' | 'Accept' | '';
  resultantRisk: number;
  status: 'Open' | 'Closed' | 'WIP';
  expectedClosureDate: string;
  remarks: string;
  createdAt: string;
}

export interface Control {
  controlId: string;
  controlName: string;
  controlDescription: string;
  controlCategory: 'Organizational' | 'People' | 'Physical' | 'Technological';
}

export interface AppSettings {
  riskMatrixType: '3x3' | '5x5';
  riskThreshold: number;
  riskReductionPercent: number;
}

export function calculateCriticality(c: number, i: number, a: number): number {
  return c * i * a;
}

export function isCriticalAsset(score: number): boolean {
  return score > 8;
}

export function calculateRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

export function getRiskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score <= 4) return 'Low';
  if (score <= 12) return 'Medium';
  if (score <= 17) return 'High';
  return 'Critical';
}

export function calculateResultantRisk(
  riskScore: number,
  effectiveness: 'Effective' | 'Not Effective' | 'NA',
  reductionPercent: number
): number {
  if (effectiveness === 'Effective') {
    return Math.round(riskScore * (1 - reductionPercent / 100));
  }
  return riskScore;
}
