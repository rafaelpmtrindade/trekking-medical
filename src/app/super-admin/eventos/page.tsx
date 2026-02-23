'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Evento, EventoStatus } from '@/types/database';
import {
    Shield, Plus, Edit2, Archive, MountainSnow, Calendar,
    X, Check, Eye, RotateCcw, Users
} from 'lucide-react';

export default function SuperAdminEventosPage() {
    const { user, loading: authLoading, isSuperAdmin } = useAuth();
    const router = useRouter();

    const [eventos, setEventos] = useState<(Evento & { _participantes: number; _membros: number })[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvento, setEditingEvento] = useState<Evento | null>(null);

    const [form, setForm] = useState({ nome: '', descricao: '', foto_url: '', data_inicio: '', data_fim: '', status: 'draft' as EventoStatus });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        if (!authLoading && user && !isSuperAdmin) router.push('/');
    }, [user, authLoading, isSuperAdmin, router]);

    const fetchEventos = useCallback(async () => {
        const { data } = await supabase
            .from('eventos')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            const withCounts = await Promise.all(
                data.map(async (evt) => {
                    const [pRes, mRes] = await Promise.all([
                        supabase.from('participantes').select('*', { count: 'exact', head: true }).eq('evento_id', evt.id),
                        supabase.from('eventos_usuarios').select('*', { count: 'exact', head: true }).eq('evento_id', evt.id).eq('is_active', true),
                    ]);
                    return { ...evt, _participantes: pRes.count || 0, _membros: mRes.count || 0 };
                })
            );
            setEventos(withCounts);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (user && isSuperAdmin) fetchEventos();
    }, [user, isSuperAdmin, fetchEventos]);

    function resetForm() {
        setForm({ nome: '', descricao: '', foto_url: '', data_inicio: '', data_fim: '', status: 'draft' });
        setEditingEvento(null);
        setFormError('');
    }

    function handleEdit(evt: Evento) {
        setForm({
            nome: evt.nome,
            descricao: evt.descricao || '',
            foto_url: evt.foto_url || '',
            data_inicio: evt.data_inicio ? evt.data_inicio.slice(0, 10) : '',
            data_fim: evt.data_fim ? evt.data_fim.slice(0, 10) : '',
            status: evt.status,
        });
        setEditingEvento(evt);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        setSaving(true);

        const payload = {
            nome: form.nome,
            descricao: form.descricao || null,
            foto_url: form.foto_url || null,
            data_inicio: form.data_inicio || null,
            data_fim: form.data_fim || null,
            status: form.status,
            ...(editingEvento ? {} : { created_by: user?.id }),
        };

        let error;
        if (editingEvento) {
            ({ error } = await supabase.from('eventos').update(payload).eq('id', editingEvento.id));
        } else {
            ({ error } = await supabase.from('eventos').insert(payload));
        }

        if (error) {
            setFormError(error.message);
        } else {
            resetForm();
            setShowForm(false);
            fetchEventos();
        }
        setSaving(false);
    }

    async function handleArchive(evtId: string) {
        if (!confirm('Tem certeza que deseja arquivar este evento?')) return;
        await supabase.from('eventos').update({ status: 'arquivado' }).eq('id', evtId);
        fetchEventos();
    }

    async function handleReactivate(evtId: string) {
        await supabase.from('eventos').update({ status: 'ativo' }).eq('id', evtId);
        fetchEventos();
    }

    if (authLoading || loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        ativo: { label: 'Ativo', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        draft: { label: 'Rascunho', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
        encerrado: { label: 'Encerrado', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        arquivado: { label: 'Arquivado', color: '#71717a', bg: 'rgba(113,113,122,0.15)' },
    };

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
                        <a href="/super-admin/eventos" className="navbar-link active">Eventos</a>
                        <a href="/super-admin/usuarios" className="navbar-link">Usuários</a>
                        <a href="/" className="navbar-link">← Plataforma</a>
                    </div>
                </div>
            </nav>

            <div className="app-container">
                <div className="page-header">
                    <h1 className="page-title">Gerenciar Eventos</h1>
                    <p className="page-subtitle">{eventos.length} eventos na plataforma</p>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={18} /> Novo Evento
                    </button>
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(4px)', zIndex: 200,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                        }}
                        onClick={() => { setShowForm(false); resetForm(); }}
                    >
                        <div className="card-static" style={{ maxWidth: 540, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {editingEvento ? <Edit2 size={22} color="var(--color-primary)" /> : <Plus size={22} color="var(--color-primary)" />}
                                    {editingEvento ? 'Editar Evento' : 'Novo Evento'}
                                </h2>
                                <button className="btn btn-icon btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}><X size={18} /></button>
                            </div>

                            {formError && <div className="alert-danger" style={{ marginBottom: 16 }}>{formError}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Nome do Evento *</label>
                                    <input className="form-input" required value={form.nome} placeholder="Ex: Trekking Montanhas 2026"
                                        onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Descrição</label>
                                    <textarea className="form-input" rows={3} value={form.descricao} placeholder="Descrição breve do evento"
                                        onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">URL da Foto</label>
                                    <input className="form-input" value={form.foto_url} placeholder="https://..."
                                        onChange={(e) => setForm({ ...form, foto_url: e.target.value })} />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Data Início</label>
                                        <input className="form-input" type="date" value={form.data_inicio}
                                            onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Data Fim</label>
                                        <input className="form-input" type="date" value={form.data_fim}
                                            onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventoStatus })}>
                                        <option value="draft">Rascunho</option>
                                        <option value="ativo">Ativo</option>
                                        <option value="encerrado">Encerrado</option>
                                        <option value="arquivado">Arquivado</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Salvando...' : editingEvento ? 'Salvar Alterações' : 'Criar Evento'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Events Grid */}
                <div style={{ display: 'grid', gap: 12 }}>
                    {eventos.map(evt => {
                        const sc = statusConfig[evt.status] || statusConfig.draft;
                        return (
                            <div key={evt.id} className="card-static" style={{ padding: '20px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {evt.foto_url ? (
                                        <img src={evt.foto_url} alt={evt.nome} style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{
                                            width: 56, height: 56, borderRadius: 'var(--radius-lg)', flexShrink: 0,
                                            background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(124,58,237,0.08))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: '1px solid rgba(167,139,250,0.2)',
                                        }}>
                                            <MountainSnow size={24} style={{ color: '#a78bfa' }} />
                                        </div>
                                    )}

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <h3 style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>{evt.nome}</h3>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                                        </div>
                                        {evt.descricao && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 6 }}>{evt.descricao}</p>}
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            {evt.data_inicio && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                    <Calendar size={13} /> {new Date(evt.data_inicio).toLocaleDateString('pt-BR')}
                                                    {evt.data_fim && <> — {new Date(evt.data_fim).toLocaleDateString('pt-BR')}</>}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Users size={13} /> {evt._participantes} part. • {evt._membros} equipe
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(evt)} title="Editar">
                                            <Edit2 size={15} />
                                        </button>
                                        {evt.status === 'arquivado' ? (
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleReactivate(evt.id)} title="Reativar">
                                                <RotateCcw size={15} />
                                            </button>
                                        ) : (
                                            <button className="btn btn-sm" onClick={() => handleArchive(evt.id)} title="Arquivar"
                                                style={{ background: 'rgba(113,113,122,0.15)', color: '#71717a', border: '1px solid rgba(113,113,122,0.3)' }}>
                                                <Archive size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {eventos.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                        <MountainSnow size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>Nenhum evento criado.</p>
                        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Clique em "Novo Evento" para começar.</p>
                    </div>
                )}
            </div>
        </>
    );
}
