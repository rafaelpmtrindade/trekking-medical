'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Evento } from '@/types/database';
import {
    MountainSnow, Shield, Calendar, Users, Activity, Archive,
    Globe, TrendingUp, Layers, ChevronRight
} from 'lucide-react';

interface Stats {
    totalEventos: number;
    eventosAtivos: number;
    totalUsuarios: number;
    totalParticipantes: number;
    totalAtendimentos: number;
}

export default function SuperAdminPage() {
    const { user, usuario, loading: authLoading, isSuperAdmin, signOut } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({ totalEventos: 0, eventosAtivos: 0, totalUsuarios: 0, totalParticipantes: 0, totalAtendimentos: 0 });
    const [eventos, setEventos] = useState<(Evento & { _participantes: number; _atendimentos: number })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        if (!authLoading && user && !isSuperAdmin) router.push('/');
    }, [user, authLoading, isSuperAdmin, router]);

    const fetchData = useCallback(async () => {
        // Stats
        const [evtRes, usrRes, partRes, atRes] = await Promise.all([
            supabase.from('eventos').select('*', { count: 'exact' }),
            supabase.from('usuarios').select('*', { count: 'exact', head: true }),
            supabase.from('participantes').select('*', { count: 'exact', head: true }),
            supabase.from('atendimentos').select('*', { count: 'exact', head: true }),
        ]);

        const allEventos = evtRes.data || [];
        const ativosCount = allEventos.filter(e => e.status === 'ativo').length;

        setStats({
            totalEventos: evtRes.count || 0,
            eventosAtivos: ativosCount,
            totalUsuarios: usrRes.count || 0,
            totalParticipantes: partRes.count || 0,
            totalAtendimentos: atRes.count || 0,
        });

        // Events with counts
        const eventosWithCounts = await Promise.all(
            allEventos.map(async (evt) => {
                const [pRes, aRes] = await Promise.all([
                    supabase.from('participantes').select('*', { count: 'exact', head: true }).eq('evento_id', evt.id),
                    supabase.from('atendimentos').select('*', { count: 'exact', head: true }).eq('evento_id', evt.id),
                ]);
                return { ...evt, _participantes: pRes.count || 0, _atendimentos: aRes.count || 0 };
            })
        );
        setEventos(eventosWithCounts);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (user && isSuperAdmin) fetchData();
    }, [user, isSuperAdmin, fetchData]);

    if (authLoading || loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    const statCards = [
        { label: 'Eventos', value: stats.totalEventos, icon: <Layers size={22} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
        { label: 'Ativos', value: stats.eventosAtivos, icon: <Globe size={22} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
        { label: 'Usuários', value: stats.totalUsuarios, icon: <Users size={22} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)' },
        { label: 'Participantes', value: stats.totalParticipantes, icon: <TrendingUp size={22} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
        { label: 'Atendimentos', value: stats.totalAtendimentos, icon: <Activity size={22} />, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
    ];

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        ativo: { label: 'Ativo', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        draft: { label: 'Rascunho', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
        encerrado: { label: 'Encerrado', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        arquivado: { label: 'Arquivado', color: '#71717a', bg: 'rgba(113,113,122,0.15)' },
    };

    return (
        <>
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-inner">
                    <a className="navbar-brand" href="/super-admin">
                        <span className="navbar-brand-icon"><Shield size={24} /></span>
                        <span className="navbar-brand-text">Super Admin</span>
                    </a>
                    <div className="navbar-links">
                        <a href="/super-admin" className="navbar-link active">Visão Geral</a>
                        <a href="/super-admin/eventos" className="navbar-link">Eventos</a>
                        <a href="/super-admin/usuarios" className="navbar-link">Usuários</a>
                        <a href="/" className="navbar-link">← Plataforma</a>
                        <button onClick={signOut} className="navbar-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>Sair</button>
                    </div>
                </div>
            </nav>

            <div className="app-container">
                {/* Header */}
                <div style={{
                    position: 'relative', overflow: 'hidden', padding: '32px 24px',
                    borderRadius: 'var(--radius-xl)', marginBottom: 32,
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(3,7,18,0) 100%)',
                    border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-inner)',
                }}>
                    <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: 4 }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            Painel Super Admin
                        </span>
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Visão global da plataforma • {usuario?.nome}
                    </p>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
                    {statCards.map(s => (
                        <div key={s.label} className="card-static" style={{
                            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                            border: `1px solid ${s.border}`, background: s.bg,
                        }}>
                            <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{s.value}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Events Overview */}
                <div className="card-static" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Layers size={18} style={{ color: '#a78bfa' }} /> Eventos
                        </h2>
                        <a href="/super-admin/eventos" className="btn btn-sm btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                            Gerenciar <ChevronRight size={14} />
                        </a>
                    </div>

                    {eventos.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>Nenhum evento criado ainda.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {eventos.map(evt => {
                                const sc = statusConfig[evt.status] || statusConfig.draft;
                                return (
                                    <div key={evt.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
                                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                                        background: 'rgba(15,23,42,0.3)', transition: 'all 0.15s ease',
                                    }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                            background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(124,58,237,0.08))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <MountainSnow size={20} style={{ color: '#a78bfa' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{evt.nome}</div>
                                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    {evt._participantes} participantes
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    {evt._atendimentos} atendimentos
                                                </span>
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '0.7rem', padding: '3px 10px', borderRadius: 20,
                                            background: sc.bg, color: sc.color, fontWeight: 600,
                                        }}>
                                            {sc.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
