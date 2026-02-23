'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Usuario } from '@/types/database';
import {
    Shield, Users, Star, UserCheck, UserX, Mail, Clock
} from 'lucide-react';

interface UsuarioWithEvents extends Usuario {
    _eventos: string[];
}

export default function SuperAdminUsuariosPage() {
    const { user, loading: authLoading, isSuperAdmin } = useAuth();
    const router = useRouter();

    const [usuarios, setUsuarios] = useState<UsuarioWithEvents[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        if (!authLoading && user && !isSuperAdmin) router.push('/');
    }, [user, authLoading, isSuperAdmin, router]);

    const fetchUsuarios = useCallback(async () => {
        const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });

        if (data) {
            const withEvents = await Promise.all(
                data.map(async (u) => {
                    const { data: memberships } = await supabase
                        .from('eventos_usuarios')
                        .select('evento:eventos(nome)')
                        .eq('usuario_id', u.id)
                        .eq('is_active', true);
                    return {
                        ...u,
                        _eventos: memberships?.map((m: any) => m.evento?.nome).filter(Boolean) || [],
                    };
                })
            );
            setUsuarios(withEvents);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (user && isSuperAdmin) fetchUsuarios();
    }, [user, isSuperAdmin, fetchUsuarios]);

    async function toggleSuperAdmin(userId: string, current: boolean) {
        if (userId === user?.id) {
            alert('Você não pode remover seu próprio Super Admin.');
            return;
        }
        const action = current ? 'remover Super Admin de' : 'promover a Super Admin';
        if (!confirm(`Deseja ${action} este usuário?`)) return;
        await supabase.from('usuarios').update({ is_super_admin: !current }).eq('id', userId);
        fetchUsuarios();
    }

    async function toggleActive(userId: string, current: boolean) {
        if (userId === user?.id) {
            alert('Você não pode desativar a si mesmo.');
            return;
        }
        await supabase.from('usuarios').update({ is_active: !current }).eq('id', userId);
        fetchUsuarios();
    }

    if (authLoading || loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <>
            <nav className="navbar">
                <div className="navbar-inner">
                    <a className="navbar-brand" href="/super-admin">
                        <span className="navbar-brand-icon"><Shield size={24} /></span>
                        <span className="navbar-brand-text">Super Admin</span>
                    </a>
                    <div className="navbar-links">
                        <a href="/super-admin" className="navbar-link">Visão Geral</a>
                        <a href="/super-admin/eventos" className="navbar-link">Eventos</a>
                        <a href="/super-admin/usuarios" className="navbar-link active">Usuários</a>
                        <a href="/" className="navbar-link">← Plataforma</a>
                    </div>
                </div>
            </nav>

            <div className="app-container">
                <div className="page-header">
                    <h1 className="page-title">Gerenciar Usuários</h1>
                    <p className="page-subtitle">{usuarios.length} usuários na plataforma</p>
                </div>

                {/* Users List */}
                <div style={{ display: 'grid', gap: 12 }}>
                    {usuarios.map(u => (
                        <div key={u.id} className="card-static" style={{
                            padding: '20px 24px', opacity: u.is_active ? 1 : 0.55,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div className="participant-avatar" style={{
                                    width: 48, height: 48, fontSize: '1.2rem', flexShrink: 0,
                                    background: u.is_super_admin
                                        ? 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(124,58,237,0.15))'
                                        : 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(14,165,233,0.1))',
                                    border: u.is_super_admin ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(56,189,248,0.2)',
                                }}>
                                    {u.nome.charAt(0)}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{u.nome}</span>
                                        {u.is_super_admin && (
                                            <span style={{
                                                fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                                                background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
                                                border: '1px solid rgba(167,139,250,0.3)', textTransform: 'uppercase',
                                            }}>
                                                Super Admin
                                            </span>
                                        )}
                                        {!u.is_active && (
                                            <span style={{
                                                fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                                                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                            }}>
                                                Inativo
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        {u.email && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Mail size={13} /> {u.email}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={13} /> {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    {u._eventos.length > 0 && (
                                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {u._eventos.map(nome => (
                                                <span key={nome} style={{
                                                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8,
                                                    background: 'rgba(16,185,129,0.08)', color: 'var(--color-text-secondary)',
                                                    border: '1px solid var(--color-border)',
                                                }}>
                                                    {nome}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    <button
                                        className="btn btn-sm"
                                        title={u.is_super_admin ? 'Remover Super Admin' : 'Promover a Super Admin'}
                                        onClick={() => toggleSuperAdmin(u.id, u.is_super_admin)}
                                        style={{
                                            background: u.is_super_admin ? 'rgba(167,139,250,0.15)' : 'transparent',
                                            color: u.is_super_admin ? '#a78bfa' : 'var(--color-text-muted)',
                                            border: `1px solid ${u.is_super_admin ? 'rgba(167,139,250,0.3)' : 'var(--color-border)'}`,
                                        }}
                                    >
                                        <Star size={15} />
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        title={u.is_active ? 'Desativar' : 'Reativar'}
                                        onClick={() => toggleActive(u.id, u.is_active)}
                                        style={{
                                            background: u.is_active ? 'transparent' : 'rgba(16,185,129,0.15)',
                                            color: u.is_active ? 'var(--color-text-muted)' : '#10b981',
                                            border: `1px solid ${u.is_active ? 'var(--color-border)' : 'rgba(16,185,129,0.3)'}`,
                                        }}
                                    >
                                        {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {usuarios.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                        <Users size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>Nenhum usuário encontrado.</p>
                    </div>
                )}
            </div>
        </>
    );
}
