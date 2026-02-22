'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Participante } from '@/types/database';
import { MountainSnow, Search, Plus, Edit2, Trash2 } from 'lucide-react';

export default function ParticipantesPage() {
    const { user, medico, loading: authLoading } = useAuth();
    const router = useRouter();

    const [participantes, setParticipantes] = useState<Participante[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({
        nome: '', nfc_tag_id: '', cpf: '', idade: '',
        telefone: '', telefone_emergencia: '', contato_emergencia_nome: '',
        alergias: '', condicoes_medicas: '', medicamentos: '', tipo_sanguineo: '',
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        fetchParticipantes();
    }, [user]);

    async function fetchParticipantes() {
        const { data } = await supabase
            .from('participantes')
            .select('*')
            .order('nome');
        if (data) setParticipantes(data);
        setLoading(false);
    }

    function resetForm() {
        setForm({
            nome: '', nfc_tag_id: '', cpf: '', idade: '',
            telefone: '', telefone_emergencia: '', contato_emergencia_nome: '',
            alergias: '', condicoes_medicas: '', medicamentos: '', tipo_sanguineo: '',
        });
        setEditingId(null);
        setFormError('');
    }

    function handleEdit(p: Participante) {
        setForm({
            nome: p.nome,
            nfc_tag_id: p.nfc_tag_id,
            cpf: p.cpf || '',
            idade: p.idade?.toString() || '',
            telefone: p.telefone || '',
            telefone_emergencia: p.telefone_emergencia || '',
            contato_emergencia_nome: p.contato_emergencia_nome || '',
            alergias: p.alergias || '',
            condicoes_medicas: p.condicoes_medicas || '',
            medicamentos: p.medicamentos || '',
            tipo_sanguineo: p.tipo_sanguineo || '',
        });
        setEditingId(p.id);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        setSaving(true);

        const payload = {
            nome: form.nome,
            nfc_tag_id: form.nfc_tag_id,
            cpf: form.cpf || null,
            idade: form.idade ? parseInt(form.idade) : null,
            telefone: form.telefone || null,
            telefone_emergencia: form.telefone_emergencia || null,
            contato_emergencia_nome: form.contato_emergencia_nome || null,
            alergias: form.alergias || null,
            condicoes_medicas: form.condicoes_medicas || null,
            medicamentos: form.medicamentos || null,
            tipo_sanguineo: form.tipo_sanguineo || null,
        };

        let error;
        if (editingId) {
            ({ error } = await supabase.from('participantes').update(payload).eq('id', editingId));
        } else {
            ({ error } = await supabase.from('participantes').insert(payload));
        }

        if (error) {
            setFormError(error.message);
        } else {
            resetForm();
            setShowForm(false);
            fetchParticipantes();
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este participante?')) return;
        await supabase.from('participantes').delete().eq('id', id);
        fetchParticipantes();
    }

    const filtered = search
        ? participantes.filter(
            (p) =>
                p.nome.toLowerCase().includes(search.toLowerCase()) ||
                p.nfc_tag_id.toLowerCase().includes(search.toLowerCase())
        )
        : participantes;

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
                        <a href="/admin/participantes" className="navbar-link active">Participantes</a>
                        <a href="/admin/medicos" className="navbar-link">Médicos</a>
                    </div>
                </div>
            </nav>

            <div className="app-container">
                <div className="page-header">
                    <h1 className="page-title">Participantes</h1>
                    <p className="page-subtitle">{participantes.length} participantes cadastrados</p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar por nome ou tag NFC..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 40, width: '100%' }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => { resetForm(); setShowForm(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <Plus size={18} /> Novo Participante
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
                        <div
                            className="card-static"
                            style={{ maxWidth: 600, width: '100%', maxHeight: '85vh', overflow: 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                                {editingId ? <Edit2 size={24} color="var(--color-primary)" /> : <Plus size={24} color="var(--color-primary)" />}
                                {editingId ? 'Editar Participante' : 'Novo Participante'}
                            </h2>

                            {formError && <div className="alert-danger" style={{ marginBottom: 16 }}>{formError}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Nome Completo *</label>
                                        <input className="form-input" required value={form.nome}
                                            onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tag NFC ID *</label>
                                        <input className="form-input" required value={form.nfc_tag_id}
                                            placeholder="Ex: NFC001"
                                            onChange={(e) => setForm({ ...form, nfc_tag_id: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">CPF</label>
                                        <input className="form-input" value={form.cpf}
                                            onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Idade</label>
                                        <input className="form-input" type="number" value={form.idade}
                                            onChange={(e) => setForm({ ...form, idade: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Telefone</label>
                                        <input className="form-input" value={form.telefone}
                                            onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tipo Sanguíneo</label>
                                        <select className="form-select" value={form.tipo_sanguineo}
                                            onChange={(e) => setForm({ ...form, tipo_sanguineo: e.target.value })}>
                                            <option value="">Selecione</option>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Contato de Emergência</label>
                                        <input className="form-input" value={form.contato_emergencia_nome}
                                            placeholder="Nome do contato"
                                            onChange={(e) => setForm({ ...form, contato_emergencia_nome: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tel. Emergência</label>
                                        <input className="form-input" value={form.telefone_emergencia}
                                            onChange={(e) => setForm({ ...form, telefone_emergencia: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Alergias</label>
                                    <textarea className="form-textarea" value={form.alergias}
                                        style={{ minHeight: 60 }}
                                        placeholder="Descreva alergias conhecidas..."
                                        onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Condições Médicas</label>
                                    <textarea className="form-textarea" value={form.condicoes_medicas}
                                        style={{ minHeight: 60 }}
                                        placeholder="Diabetes, hipertensão, asma..."
                                        onChange={(e) => setForm({ ...form, condicoes_medicas: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Medicamentos em Uso</label>
                                    <textarea className="form-textarea" value={form.medicamentos}
                                        style={{ minHeight: 60 }}
                                        placeholder="Medicamentos que está tomando..."
                                        onChange={(e) => setForm({ ...form, medicamentos: e.target.value })} />
                                </div>

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-secondary"
                                        onClick={() => { setShowForm(false); resetForm(); }}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Tag NFC</th>
                                <th>Idade</th>
                                <th>Tipo Sang.</th>
                                <th>Alergias</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id}>
                                    <td><strong>{p.nome}</strong></td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>{p.nfc_tag_id}</td>
                                    <td>{p.idade || '-'}</td>
                                    <td>{p.tipo_sanguineo || '-'}</td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.alergias || '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-sm btn-secondary" title="Editar" onClick={() => handleEdit(p)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn btn-sm btn-danger" title="Excluir" onClick={() => handleDelete(p.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                        {search ? 'Nenhum participante encontrado.' : 'Nenhum participante cadastrado.'}
                    </div>
                )}
            </div>
        </>
    );
}
