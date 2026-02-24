'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Evento, EventoUsuario, Permissao } from '@/types/database';

interface EventContextType {
    eventos: Evento[];
    selectedEvento: Evento | null;
    membership: EventoUsuario | null;
    permissions: string[];
    loading: boolean;
    selectEvento: (evento: Evento) => void;
    clearEvento: () => void;
    hasPermission: (codigo: string) => boolean;

    // Public selection (before login)
    publicSelectedEventId: string | null;
    selectPublicEvent: (id: string) => void;
    clearPublicEvent: () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
    const { user, usuario, isSuperAdmin } = useAuth();
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
    const [membership, setMembership] = useState<EventoUsuario | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [publicSelectedEventId, setPublicSelectedEventId] = useState<string | null>(null);

    // Initialize public selection from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('trekking_public_event_id');
        if (saved) setPublicSelectedEventId(saved);
    }, []);

    const selectPublicEvent = useCallback((id: string) => {
        localStorage.setItem('trekking_public_event_id', id);
        setPublicSelectedEventId(id);
    }, []);

    const clearPublicEvent = useCallback(() => {
        localStorage.removeItem('trekking_public_event_id');
        setPublicSelectedEventId(null);
    }, []);

    // Fetch events and auto-select in a single operation to avoid race conditions
    // (prevents flickering when dashboard checks selectedEvento before auto-select runs)
    useEffect(() => {
        if (!user) {
            setEventos([]);
            setSelectedEvento(null);
            setMembership(null);
            setPermissions([]);
            setLoading(false);
            return;
        }

        async function fetchAndAutoSelect() {
            if (!user) return;

            let evts: Evento[] = [];
            if (isSuperAdmin) {
                const { data } = await supabase
                    .from('eventos')
                    .select('*')
                    .order('created_at', { ascending: false });
                evts = data || [];
            } else {
                const { data: memberships } = await supabase
                    .from('eventos_usuarios')
                    .select('evento:eventos(*)')
                    .eq('usuario_id', user.id)
                    .eq('is_active', true);

                evts = memberships
                    ?.map((m: any) => m.evento)
                    .filter(Boolean) || [];
            }

            setEventos(evts);

            // Auto-select event before setting loading to false
            // This prevents the gap where loading=false but selectedEvento=null
            let autoEvent: Evento | null = null;
            if (evts.length === 1) {
                autoEvent = evts[0];
            } else if (evts.length > 1) {
                const publicId = publicSelectedEventId || localStorage.getItem('trekking_public_event_id');
                if (publicId) {
                    autoEvent = evts.find(e => e.id === publicId) || null;
                }
            }

            if (autoEvent && !selectedEvento) {
                await selectEvento(autoEvent);
            }

            setLoading(false);
        }

        fetchAndAutoSelect();
    }, [user, isSuperAdmin]);

    // When event is selected, fetch membership and permissions
    const selectEvento = useCallback(async (evento: Evento) => {
        setSelectedEvento(evento);

        if (!user) return;

        if (isSuperAdmin) {
            // Super admin has all permissions
            const { data: allPerms } = await supabase
                .from('permissoes')
                .select('codigo');
            setPermissions(allPerms?.map(p => p.codigo) || []);
            setMembership({
                id: 'super-admin',
                evento_id: evento.id,
                usuario_id: user.id,
                role: 'admin_evento',
                is_active: true,
                created_at: new Date().toISOString(),
            });
            return;
        }

        // Fetch user's membership for this event
        const { data: eu } = await supabase
            .from('eventos_usuarios')
            .select('*')
            .eq('evento_id', evento.id)
            .eq('usuario_id', user.id)
            .eq('is_active', true)
            .single();

        setMembership(eu);

        if (eu) {
            // Fetch permissions for this membership
            const { data: perms } = await supabase
                .from('eventos_usuarios_permissoes')
                .select('permissao:permissoes(codigo)')
                .eq('evento_usuario_id', eu.id);

            const codes = perms
                ?.map((p: any) => p.permissao?.codigo)
                .filter(Boolean) || [];
            setPermissions(codes);
        } else {
            setPermissions([]);
        }
    }, [user, isSuperAdmin]);

    const clearEvento = useCallback(() => {
        setSelectedEvento(null);
        setMembership(null);
        setPermissions([]);
    }, []);

    const hasPermission = useCallback((codigo: string) => {
        if (isSuperAdmin) return true;
        return permissions.includes(codigo);
    }, [isSuperAdmin, permissions]);

    return (
        <EventContext.Provider value={{
            eventos,
            selectedEvento,
            membership,
            permissions,
            loading,
            selectEvento,
            clearEvento,
            hasPermission,
            publicSelectedEventId,
            selectPublicEvent,
            clearPublicEvent,
        }}>
            {children}
        </EventContext.Provider>
    );
}

export function useEvent() {
    const context = useContext(EventContext);
    if (!context) throw new Error('useEvent must be used within EventProvider');
    return context;
}
