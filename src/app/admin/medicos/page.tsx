'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Medico } from '@/types/database';
import { MountainSnow, Plus, Stethoscope, Star, Phone } from 'lucide-react';

export default function MedicosPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [medicos, setMedicos] = useState<Medico[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form
    const [form, setForm] = useState({
        email: '', password: '', nome: '', crm: '',
        especialidade: '', telefone: '', is_admin: false,
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        fetchMedicos();
    }, [user]);

    async function fetchMedicos() {
        const { data } = await supabase.from('medicos').select('*').order('nome');
        if (data) setMedicos(data);
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        setSaving(true);

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: { nome: form.nome },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário');

            // 2. Create medico profile
            const { error: medError } = await supabase.from('medicos').insert({
                id: authData.user.id,
                nome: form.nome,
                crm: form.crm || null,
                especialidade: form.especialidade || null,
                telefone: form.telefone || null,
                is_admin: form.is_admin,
            });

            if (medError) throw medError;

            setShowForm(false);
            setForm({ email: '', password: '', nome: '', crm: '', especialidade: '', telefone: '', is_admin: false });
            fetchMedicos();
        } catch (err) {
            setFormError((err as Error).message);
        }
        setSaving(false);
    }

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
                        <a href="/admin/medicos" className="navbar-link active">Médicos</a>
                    </div>
                </div>
            </nav>

            <div className="app-container">
                <div className="page-header">
                    <h1 className="page-title">Equipe Médica</h1>
                    <p className="page-subtitle">{medicos.length} médicos cadastrados</p>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={18} /> Novo Médico
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
                        onClick={() => setShowForm(false)}
                    >
                        <div
                            className="card-static"
                            style={{ maxWidth: 500, width: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Plus size={24} color="var(--color-primary)" /> Cadastrar Médico
                            </h2>

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

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">CRM</label>
                                        <input className="form-input" value={form.crm}
                                            onChange={(e) => setForm({ ...form, crm: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Especialidade</label>
                                        <input className="form-input" value={form.especialidade}
                                            placeholder="Ex: Clínico Geral"
                                            onChange={(e) => setForm({ ...form, especialidade: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Telefone</label>
                                    <input className="form-input" value={form.telefone}
                                        onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.is_admin}
                                            onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} />
                                        <span style={{ fontSize: '0.9rem' }}>Conceder acesso de administrador</span>
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Criando...' : 'Cadastrar Médico'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Medicos Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {medicos.map((m) => (
                        <div key={m.id} className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                                <div className="participant-avatar" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                                    {m.nome.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{m.nome}</div>
                                    {m.crm && (
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                            CRM: {m.crm}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {m.especialidade && (
                                    <span className="badge" style={{
                                        background: 'rgba(14,165,233,0.15)', color: '#0ea5e9',
                                        border: '1px solid rgba(14,165,233,0.3)',
                                        display: 'flex', alignItems: 'center', gap: 6
                                    }}>
                                        <Stethoscope size={14} /> {m.especialidade}
                                    </span>
                                )}
                                {m.is_admin && (
                                    <span className="badge" style={{
                                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                                        border: '1px solid rgba(245,158,11,0.3)',
                                        display: 'flex', alignItems: 'center', gap: 6
                                    }}>
                                        <Star size={14} /> Admin
                                    </span>
                                )}
                            </div>
                            {m.telefone && (
                                <p style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                                    <Phone size={14} /> {m.telefone}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {medicos.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                        Nenhum médico cadastrado ainda.
                    </div>
                )}
            </div>
        </>
    );
}
