import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Asset, Risk, AppSettings, getRiskLevel } from '../data/types';

interface AppContextType {
  assets: Asset[];
  risks: Risk[];
  settings: AppSettings;
  loading: boolean;
  addAsset: (asset: Omit<Asset, 'id' | 'criticalityScore' | 'isCritical' | 'criticalityApproved' | 'criticalityApprovedBy'>) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  approveAssetCriticality: (assetId: string, userId: string) => Promise<void>;
  addRisk: (risk: Omit<Risk, 'id' | 'riskScore'>) => Promise<void>;
  updateRisk: (risk: Risk) => Promise<void>;
  deleteRisk: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  importAssets: (assets: Omit<Asset, 'id' | 'criticalityScore' | 'isCritical' | 'criticalityApproved' | 'criticalityApprovedBy'>[]) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: AppSettings = { riskMatrixType: '5x5', riskThreshold: 12, riskReductionPercent: 40 };

function mapDbAsset(row: any): Asset {
  return {
    id: row.id,
    assetId: row.asset_id,
    assetName: row.asset_name,
    assetType: row.asset_type,
    dataClassification: row.data_classification || '',
    description: row.description || '',
    assetOwner: row.asset_owner || '',
    department: row.department || '',
    location: row.location || '',
    confidentiality: row.confidentiality,
    integrity: row.integrity,
    availability: row.availability,
    criticalityScore: row.criticality_score ?? 0,
    isCritical: row.is_critical ?? false,
    criticalityApproved: row.criticality_approved ?? false,
    criticalityApprovedBy: row.criticality_approved_by ?? null,
  };
}

function mapDbRisk(row: any): Risk {
  return {
    id: row.id,
    linkedAssetId: row.linked_asset_id,
    threat: row.threat,
    vulnerability: row.vulnerability,
    existingControlIds: row.existing_control_ids || [],
    controlEffectiveness: row.control_effectiveness,
    riskScenario: row.risk_scenario || '',
    consequence: row.consequence || '',
    riskOwner: row.risk_owner || '',
    likelihood: row.likelihood,
    impact: row.impact,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    managementDecision: row.management_decision || '',
    resultantRisk: row.resultant_risk,
    status: row.status,
    expectedClosureDate: row.expected_closure_date || '',
    remarks: row.remarks || '',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [settingsId, setSettingsId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assetRes, riskRes, settingsRes] = await Promise.all([
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('risks').select('*').order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').limit(1).single(),
      ]);
      if (assetRes.data) setAssets(assetRes.data.map(mapDbAsset));
      if (riskRes.data) setRisks(riskRes.data.map(mapDbRisk));
      if (settingsRes.data) {
        setSettings({
          riskMatrixType: settingsRes.data.risk_matrix_type as '3x3' | '5x5',
          riskThreshold: settingsRes.data.risk_threshold,
          riskReductionPercent: settingsRes.data.risk_reduction_percent,
        });
        setSettingsId(settingsRes.data.id);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addAsset = useCallback(async (asset: Omit<Asset, 'id' | 'criticalityScore' | 'isCritical' | 'criticalityApproved' | 'criticalityApprovedBy'>) => {
    const { error } = await supabase.from('assets').insert({
      asset_id: asset.assetId,
      asset_name: asset.assetName,
      asset_type: asset.assetType,
      data_classification: asset.dataClassification,
      description: asset.description,
      asset_owner: asset.assetOwner,
      department: asset.department,
      location: (asset as any).location || '',
      confidentiality: asset.confidentiality,
      integrity: asset.integrity,
      availability: asset.availability,
    });
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const updateAsset = useCallback(async (asset: Asset) => {
    const { error } = await supabase.from('assets').update({
      asset_id: asset.assetId,
      asset_name: asset.assetName,
      asset_type: asset.assetType,
      data_classification: asset.dataClassification,
      description: asset.description,
      asset_owner: asset.assetOwner,
      department: asset.department,
      location: asset.location || '',
      confidentiality: asset.confidentiality,
      integrity: asset.integrity,
      availability: asset.availability,
    }).eq('id', asset.id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteAsset = useCallback(async (id: string) => {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const approveAssetCriticality = useCallback(async (assetId: string, userId: string) => {
    const { error } = await supabase.from('assets').update({
      criticality_approved: true,
      criticality_approved_by: userId,
    }).eq('id', assetId);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const addRisk = useCallback(async (risk: Omit<Risk, 'id' | 'riskScore'>) => {
    const riskScore = risk.likelihood * risk.impact;
    const riskLevel = getRiskLevel(riskScore);
    const { error } = await supabase.from('risks').insert({
      linked_asset_id: risk.linkedAssetId,
      threat: risk.threat,
      vulnerability: risk.vulnerability,
      existing_control_ids: risk.existingControlIds,
      control_effectiveness: risk.controlEffectiveness,
      risk_scenario: risk.riskScenario,
      consequence: risk.consequence,
      risk_owner: risk.riskOwner,
      likelihood: risk.likelihood,
      impact: risk.impact,
      risk_score: riskScore,
      risk_level: riskLevel,
      management_decision: risk.managementDecision || null,
      resultant_risk: risk.resultantRisk,
      status: risk.status,
      expected_closure_date: risk.expectedClosureDate || null,
      remarks: risk.remarks,
    });
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const updateRisk = useCallback(async (risk: Risk) => {
    const riskScore = risk.likelihood * risk.impact;
    const riskLevel = getRiskLevel(riskScore);
    const { error } = await supabase.from('risks').update({
      linked_asset_id: risk.linkedAssetId,
      threat: risk.threat,
      vulnerability: risk.vulnerability,
      existing_control_ids: risk.existingControlIds,
      control_effectiveness: risk.controlEffectiveness,
      risk_scenario: risk.riskScenario,
      consequence: risk.consequence,
      risk_owner: risk.riskOwner,
      likelihood: risk.likelihood,
      impact: risk.impact,
      risk_score: riskScore,
      risk_level: riskLevel,
      management_decision: risk.managementDecision || null,
      resultant_risk: risk.resultantRisk,
      status: risk.status,
      expected_closure_date: risk.expectedClosureDate,
      remarks: risk.remarks,
    }).eq('id', risk.id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteRisk = useCallback(async (id: string) => {
    const { error } = await supabase.from('risks').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const { error } = await supabase.from('app_settings').upsert(
      {
        id: settingsId,
        risk_matrix_type: newSettings.riskMatrixType,
        risk_threshold: newSettings.riskThreshold,
        risk_reduction_percent: newSettings.riskReductionPercent,
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
    await fetchAll();
  }, [fetchAll, settingsId]);

  const importAssets = useCallback(async (assetsToImport: Omit<Asset, 'id' | 'criticalityScore' | 'isCritical' | 'criticalityApproved' | 'criticalityApprovedBy'>[]) => {
    const { error } = await supabase.from('assets').insert(assetsToImport.map(asset => ({
      asset_id: asset.assetId,
      asset_name: asset.assetName,
      asset_type: asset.assetType,
      data_classification: asset.dataClassification,
      description: asset.description,
      asset_owner: asset.assetOwner,
      department: asset.department,
      location: asset.location,
      confidentiality: asset.confidentiality,
      integrity: asset.integrity,
      availability: asset.availability,
    })));
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const refreshData = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const contextValue = useMemo(() => ({
    assets,
    risks,
    settings,
    loading,
    addAsset,
    updateAsset,
    deleteAsset,
    approveAssetCriticality,
    addRisk,
    updateRisk,
    deleteRisk,
    updateSettings,
    importAssets,
    refreshData,
  }), [
    assets,
    risks,
    settings,
    loading,
    addAsset,
    updateAsset,
    deleteAsset,
    approveAssetCriticality,
    addRisk,
    updateRisk,
    deleteRisk,
    updateSettings,
    importAssets,
    refreshData,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
