'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Usuario, EventoUsuario, Permissao } from '@/types/database';

interface AuthContextType {
    user: User | null;
    usuario: Usuario | null;
    session: Session | null;
    loading: boolean;
    isSuperAdmin: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchUsuario(userId: string) {
        const { data } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .single();
        setUsuario(data);
        setLoading(false);
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUsuario(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUsuario(session.user.id);
            } else {
                setUsuario(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return { error: null };
    }

    async function signOut() {
        await supabase.auth.signOut();
        setUser(null);
        setUsuario(null);
        setSession(null);
    }

    const isSuperAdmin = usuario?.is_super_admin === true;

    return (
        <AuthContext.Provider value={{ user, usuario, session, loading, isSuperAdmin, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
