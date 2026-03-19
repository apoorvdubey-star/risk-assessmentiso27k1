import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Asset, Risk, AppSettings } from '../data/types';

interface AppContextType {
  assets: Asset[];
  risks: Risk[];
  settings: AppSettings;
  addAsset: (asset: Asset) => void;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
  addRisk: (risk: Risk) => void;
  updateRisk: (risk: Risk) => void;
  deleteRisk: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  importAssets: (assets: Asset[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = { assets: 'isms_assets', risks: 'isms_risks', settings: 'isms_settings' };

const defaultSettings: AppSettings = { riskMatrixType: '5x5', riskThreshold: 12, riskReductionPercent: 40 };

function load<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(() => load(STORAGE_KEYS.assets, []));
  const [risks, setRisks] = useState<Risk[]>(() => load(STORAGE_KEYS.risks, []));
  const [settings, setSettings] = useState<AppSettings>(() => load(STORAGE_KEYS.settings, defaultSettings));

  const persist = useCallback((key: string, data: unknown) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, []);

  const addAsset = useCallback((asset: Asset) => {
    setAssets(prev => { const next = [...prev, asset]; persist(STORAGE_KEYS.assets, next); return next; });
  }, [persist]);

  const updateAsset = useCallback((asset: Asset) => {
    setAssets(prev => { const next = prev.map(a => a.id === asset.id ? asset : a); persist(STORAGE_KEYS.assets, next); return next; });
  }, [persist]);

  const deleteAsset = useCallback((id: string) => {
    setAssets(prev => { const next = prev.filter(a => a.id !== id); persist(STORAGE_KEYS.assets, next); return next; });
  }, [persist]);

  const addRisk = useCallback((risk: Risk) => {
    setRisks(prev => { const next = [...prev, risk]; persist(STORAGE_KEYS.risks, next); return next; });
  }, [persist]);

  const updateRisk = useCallback((risk: Risk) => {
    setRisks(prev => { const next = prev.map(r => r.id === risk.id ? risk : r); persist(STORAGE_KEYS.risks, next); return next; });
  }, [persist]);

  const deleteRisk = useCallback((id: string) => {
    setRisks(prev => { const next = prev.filter(r => r.id !== id); persist(STORAGE_KEYS.risks, next); return next; });
  }, [persist]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => { const next = { ...prev, ...partial }; persist(STORAGE_KEYS.settings, next); return next; });
  }, [persist]);

  const importAssets = useCallback((newAssets: Asset[]) => {
    setAssets(prev => {
      const existing = new Set(prev.map(a => a.assetId));
      const unique = newAssets.filter(a => !existing.has(a.assetId));
      const next = [...prev, ...unique];
      persist(STORAGE_KEYS.assets, next);
      return next;
    });
  }, [persist]);

  return (
    <AppContext.Provider value={{ assets, risks, settings, addAsset, updateAsset, deleteAsset, addRisk, updateRisk, deleteRisk, updateSettings, importAssets }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
