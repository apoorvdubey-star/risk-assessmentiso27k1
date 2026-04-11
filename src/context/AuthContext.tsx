import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'risk_owner' | 'user';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  tenantId: string | null;
  hasTenant: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isRiskOwner: boolean;
  canEdit: boolean;
  refreshRole: () => Promise<void>;
  resolveTenant: () => Promise<string | null>;
  createTenant: (name: string, domain: string, industry: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>('user');
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const loadUserRole = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_user_role');
      setRole((data as AppRole) || 'user');
    } catch {
      setRole('user');
    }
  }, []);

  const ensureProfile = useCallback(async (u: User) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', u.id).maybeSingle();
      if (!profile) {
        await supabase.rpc('handle_signup', {
          _full_name: u.user_metadata.full_name || u.user_metadata.name || '',
          _department: '',
        });
      }
    } catch (err) {
      console.error('Error ensuring profile:', err);
    }
  }, []);

  const resolveTenant = useCallback(async (): Promise<string | null> => {
    // Check existing membership
    const { data: membership } = await supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .limit(1)
      .maybeSingle();

    if (membership?.tenant_id) {
      setTenantId(membership.tenant_id);
      return membership.tenant_id;
    }

    // Try auto-join by domain
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.email) {
      const { data: joinedTenantId } = await supabase.rpc('join_tenant_by_domain', {
        _email: currentUser.email,
      });
      if (joinedTenantId) {
        setTenantId(joinedTenantId);
        return joinedTenantId;
      }
    }

    return null;
  }, []);

  const createTenant = useCallback(async (name: string, domain: string, industry: string): Promise<string> => {
    const { data, error } = await supabase.rpc('create_tenant_and_assign', {
      _name: name,
      _domain: domain || null,
      _industry: industry,
    });
    if (error) throw error;
    const tid = data as string;
    setTenantId(tid);
    await loadUserRole();
    return tid;
  }, [loadUserRole]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => {
          await ensureProfile(session.user);
          const tid = await resolveTenant();
          if (tid) {
            await loadUserRole();
          }
          setLoading(false);
        }, 0);
      } else {
        setRole('user');
        setTenantId(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [ensureProfile, loadUserRole, resolveTenant]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole('user');
    setTenantId(null);
  };

  const isAdmin = role === 'admin';
  const isRiskOwner = role === 'risk_owner';
  const canEdit = isAdmin || isRiskOwner;
  const hasTenant = !!tenantId;

  return (
    <AuthContext.Provider value={{
      session, user, role, loading, tenantId, hasTenant,
      signInWithGoogle, signInWithApple, signOut,
      isAdmin, isRiskOwner, canEdit, refreshRole: loadUserRole,
      resolveTenant, createTenant,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
