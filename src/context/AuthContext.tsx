import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'risk_owner' | 'user';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, department: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isRiskOwner: boolean;
  canEdit: boolean;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>('user');
  const [loading, setLoading] = useState(true);

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
          _full_name: u.user_metadata.full_name || '',
          _department: u.user_metadata.department || '',
        });
      }
    } catch (err) {
      console.error('Error ensuring profile:', err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => {
          await ensureProfile(session.user);
          await loadUserRole();
          setLoading(false);
        }, 0);
      } else {
        setRole('user');
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [ensureProfile, loadUserRole]);

  const signUp = async (email: string, password: string, fullName: string, department: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, department },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole('user');
  };

  const isAdmin = role === 'admin';
  const isRiskOwner = role === 'risk_owner';
  const canEdit = isAdmin || isRiskOwner;

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signUp, signIn, signOut, isAdmin, isRiskOwner, canEdit, refreshRole: loadUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
