'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import type { EventoUsuario } from '@/types/database';
import { MountainSnow, Plus, Stethoscope, Star, Phone, Shield, UserCheck, X } from 'lucide-react';

interface EquipeMember {
    id: string;
    usuario_id: string;
    role: string;
    is_active: boolean;
    usuario: {
        id: string;
        nome: string;
        email?: string;
    };
    permissoes_codigos: string[];
}

export default function EquipePage() {
    const { user, loading: authLoading, isSuperAdmin } = useAuth();
    const { selectedEvento, hasPermission } = useEvent();
    const router = useRouter();

    const [equipe, setEquipe] = useState<EquipeMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form
    const [form, setForm] = useState({
        email: '', password: '', nome: '', role: 'equipe_saude' as string,
        permissoes: [] as string[],
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [availablePermissions, setAvailablePermissions] = useState<{ id: string; codigo: string; descricao: string }[]>([]);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        if (!authLoading && user && !selectedEvento) router.push('/');
    }, [user, authLoading, selectedEvento, router]);

    useEffect(() => {
        if (!user || !selectedEvento) return;
        fetchEquipe();
        fetchPermissions();
    }, [user, selectedEvento]);

    async function fetchPermissions() {
        const { data } = await supabase.from('permissoes').select('id, codigo, descricao');
        if (data) setAvailablePermissions(data);
    }

    async function fetchEquipe() {
        if (!selectedEvento) return;
        const { data } = await supabase
            .from('eventos_usuarios')
            .select('id, usuario_id, role, is_active, usuario:usuarios(id, nome, email)')
            .eq('evento_id', selectedEvento.id)
            .order('created_at', { ascending: false });

        if (data) {
            // For each member, fetch their permissions
            const membersWithPerms = await Promise.all(
                data.map(async (m: any) => {
                    const { data: perms } = await supabase
                        .from('eventos_usuarios_permissoes')
                        .select('permissao:permissoes(codigo)')
                        .eq('evento_usuario_id', m.id);
                    return {
                        ...m,
                        usuario: m.usuario,
                        permissoes_codigos: perms?.map((p: any) => p.permissao?.codigo).filter(Boolean) || [],
                    };
                })
            );
            setEquipe(membersWithPerms);
        }
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        setSaving(true);

        try {
            if (!selectedEvento) throw new Error('Nenhum evento selecionado');

            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: { data: { nome: form.nome } },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário');

            // 2. Create usuario profile
            const { error: userError } = await supabase.from('usuarios').insert({
                id: authData.user.id,
                nome: form.nome,
                email: form.email,
                is_super_admin: false,
            });

            if (userError) throw userError;

            // 3. Also create in medicos for backward compatibility
            const { error: medError } = await supabase.from('medicos').insert({
                id: authData.user.id,
                nome: form.nome,
                is_admin: form.role === 'admin_evento',
            });

            // Ignore medicos error (backward compat, not critical)

            // 4. Link to event
            const { data: euData, error: euError } = await supabase.from('eventos_usuarios').insert({
                evento_id: selectedEvento.id,
                usuario_id: authData.user.id,
                role: form.role,
                is_active: true,
            }).select('id').single();

            if (euError) throw euError;

            // 5. Assign permissions
            if (euData && form.permissoes.length > 0) {
                const permRows = await Promise.all(
                    form.permissoes.map(async (codigo) => {
                        const perm = availablePermissions.find(p => p.codigo === codigo);
                        if (perm) return { evento_usuario_id: euData.id, permissao_id: perm.id };
                        return null;
                    })
                );
                const validRows = permRows.filter(Boolean);
                if (validRows.length > 0) {
                    await supabase.from('eventos_usuarios_permissoes').insert(validRows);
                }
            }

            setShowForm(false);
            setForm({ email: '', password: '', nome: '', role: 'equipe_saude', permissoes: [] });
            fetchEquipe();
        } catch (err) {
            setFormError((err as Error).message);
        }
        setSaving(false);
    }

    const togglePermission = (codigo: string) => {
        setForm(prev => ({
            ...prev,
            permissoes: prev.permissoes.includes(codigo)
                ? prev.permissoes.filter(p => p !== codigo)
                : [...prev.permissoes, codigo],
        }));
    };

    if (authLoading || loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <>
            <nav className="navbar">
                <div className="navbar-inner">
                    <a className="navbar-brand" href="/dashboard">
                        <span className="navbar-brand-icon"><MountainSnow size={24} /></span>
                        <span className="navbar-brand-text">Trekking Medical</span>
                    </a>
                    <div className="navbar-links">
                        <a href="/dashboard" className="navbar-link">Dashboard</a>
                        <a href="/admin/participantes" className="navbar-link">Participantes</a>
                        <a href="/admin/medicos" className="navbar-link active">Equipe</a>
                    </div>
                </div>
            </nav>

            <div className="app-container">
                <div className="page-header">
                    <h1 className="page-title">Equipe de Saúde</h1>
                    <p className="page-subtitle">
                        {equipe.filter(m => m.is_active).length} membros ativos
                        {selectedEvento && <> • {selectedEvento.nome}</>}
                    </p>
                </div>

                {hasPermission('gerenciar_equipe') && (
                    <div style={{ marginBottom: 24 }}>
                        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Plus size={18} /> Novo Membro
                        </button>
                    </div>
                )}

                {/* Form Modal */}
                {showForm && (
                    <div
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(4px)', zIndex: 200,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                        }}
                        onClick={() => setShowForm(false)}
                    >
                        <div
                            className="card-static"
                            style={{ maxWidth: 540, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Plus size={24} color="var(--color-primary)" /> Novo Membro
                                </h2>
                                <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}><X size={18} /></button>
                            </div>

                            {formError && (
                                <div className="alert-danger" style={{ marginBottom: 16 }}>{formError}</div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Nome Completo *</label>
                                    <input className="form-input" required value={form.nome}
                                        onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email *</label>
                                        <input className="form-input" type="email" required value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Senha *</label>
                                        <input className="form-input" type="password" required minLength={6}
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role no Evento</label>
                                    <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                        <option value="equipe_saude">Equipe de Saúde</option>
                                        <option value="admin_evento">Admin do Evento</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ marginBottom: 8 }}>Permissões</label>
                                    <div style={{ display: 'grid', gap: 6 }}>
                                        {availablePermissions.map(p => (
                                            <label key={p.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                                                background: form.permissoes.includes(p.codigo) ? 'rgba(16,185,129,0.1)' : 'transparent',
                                                border: `1px solid ${form.permissoes.includes(p.codigo) ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`,
                                                transition: 'all 0.15s ease',
                                            }}>
                                                <input type="checkbox"
                                                    checked={form.permissoes.includes(p.codigo)}
                                                    onChange={() => togglePermission(p.codigo)} />
                                                <span style={{ fontSize: '0.85rem' }}>{p.descricao || p.codigo}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Criando...' : 'Cadastrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Team Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {equipe.map((m) => (
                        <div key={m.id} className="card" style={{ opacity: m.is_active ? 1 : 0.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                                <div className="participant-avatar" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                                    {m.usuario?.nome?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{m.usuario?.nome}</div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                        {m.usuario?.email}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span className="badge" style={{
                                    background: m.role === 'admin_evento' ? 'rgba(245,158,11,0.15)' : 'rgba(14,165,233,0.15)',
                                    color: m.role === 'admin_evento' ? '#f59e0b' : '#0ea5e9',
                                    border: `1px solid ${m.role === 'admin_evento' ? 'rgba(245,158,11,0.3)' : 'rgba(14,165,233,0.3)'}`,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    {m.role === 'admin_evento' ? <Shield size={14} /> : <Stethoscope size={14} />}
                                    {m.role === 'admin_evento' ? 'Admin' : 'Equipe de Saúde'}
                                </span>
                                {!m.is_active && (
                                    <span className="badge" style={{
                                        background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                    }}>
                                        Inativo
                                    </span>
                                )}
                            </div>
                            {m.permissoes_codigos.length > 0 && (
                                <div style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {m.permissoes_codigos.slice(0, 3).map(p => (
                                        <span key={p} style={{
                                            fontSize: '0.7rem', padding: '2px 6px', borderRadius: 8,
                                            background: 'rgba(148,163,184,0.1)', color: 'var(--color-text-muted)',
                                            border: '1px solid var(--color-border)',
                                        }}>
                                            {p.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                    {m.permissoes_codigos.length > 3 && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            +{m.permissoes_codigos.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {equipe.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                        Nenhum membro na equipe deste evento.
                    </div>
                )}
            </div>
        </>
    );
}
