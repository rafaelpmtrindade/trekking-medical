'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import type { Participante } from '@/types/database';
import { MountainSnow, Search, Plus, Edit2, Trash2, Eye, X } from 'lucide-react';
import ParticipantProfile from '@/components/ParticipantProfile';
import AppNavbar from '@/components/AppNavbar';

export default function ParticipantesPage() {
    const { user, loading: authLoading } = useAuth();
    const { selectedEvento, loading: eventLoading } = useEvent();
    const router = useRouter();

    const [participantes, setParticipantes] = useState<Participante[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingParticipante, setViewingParticipante] = useState<Participante | null>(null);

    // Form state
    const [form, setForm] = useState({
        nome: '', nfc_tag_id: '', cpf: '', idade: '',
        telefone: '', telefone_emergencia: '', contato_emergencia_nome: '',
        alergias: '', condicoes_medicas: '', medicamentos: '', tipo_sanguineo: '',
        // Novas informações clínicas
        peso: '', altura: '', cidade_estado: '', equipe_familia: '',
        biotipo: '', indicativo_saude: '3', cirurgias: '', observacao_hakuna: '',
        atividade_fisica_semanal: '', plano_saude: '', outras_informacoes_medicas: ''
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    async function fetchParticipantes() {
        if (!selectedEvento) return;
        const { data } = await supabase
            .from('participantes')
            .select('*')
            .eq('evento_id', selectedEvento.id)
            .order('nome');
        if (data) setParticipantes(data);
        setLoading(false);
    }

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (!authLoading && !eventLoading && user && !selectedEvento) router.push('/');
    }, [user, authLoading, eventLoading, selectedEvento, router]);

    useEffect(() => {
        if (!user || !selectedEvento) return;
        fetchParticipantes();
    }, [user, selectedEvento]);

    function resetForm() {
        setForm({
            nome: '', nfc_tag_id: '', cpf: '', idade: '',
            telefone: '', telefone_emergencia: '', contato_emergencia_nome: '',
            alergias: '', condicoes_medicas: '', medicamentos: '', tipo_sanguineo: '',
            peso: '', altura: '', cidade_estado: '', equipe_familia: '',
            biotipo: '', indicativo_saude: '3', cirurgias: '', observacao_hakuna: '',
            atividade_fisica_semanal: '', plano_saude: '', outras_informacoes_medicas: ''
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
            peso: p.peso?.toString() || '',
            altura: p.altura?.toString() || '',
            cidade_estado: p.cidade_estado || '',
            equipe_familia: p.equipe_familia || '',
            biotipo: p.biotipo || '',
            indicativo_saude: p.indicativo_saude?.toString() || '3',
            cirurgias: p.cirurgias || '',
            observacao_hakuna: p.observacao_hakuna || '',
            atividade_fisica_semanal: p.atividade_fisica_semanal || '',
            plano_saude: p.plano_saude || '',
            outras_informacoes_medicas: p.outras_informacoes_medicas || ''
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
            peso: form.peso ? parseFloat(form.peso.replace(',', '.')) : null,
            altura: form.altura ? parseFloat(form.altura.replace(',', '.')) : null,
            cidade_estado: form.cidade_estado || null,
            equipe_familia: form.equipe_familia || null,
            biotipo: form.biotipo || null,
            indicativo_saude: parseInt(form.indicativo_saude),
            cirurgias: form.cirurgias || null,
            observacao_hakuna: form.observacao_hakuna || null,
            atividade_fisica_semanal: form.atividade_fisica_semanal || null,
            plano_saude: form.plano_saude || null,
            outras_informacoes_medicas: form.outras_informacoes_medicas || null,
        };

        let error;
        if (editingId) {
            ({ error } = await supabase.from('participantes').update(payload).eq('id', editingId));
        } else {
            ({ error } = await supabase.from('participantes').insert({ ...payload, evento_id: selectedEvento?.id }));
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

    if (authLoading || eventLoading || loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <>
            <AppNavbar activePage="participantes" />

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
                                        <label className="form-label">Telefone de Emergência</label>
                                        <input className="form-input" value={form.telefone_emergencia}
                                            onChange={(e) => setForm({ ...form, telefone_emergencia: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>Dados Complementares</h3>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Cidade / Estado</label>
                                        <input className="form-input" value={form.cidade_estado}
                                            placeholder="Ex: Caarapó - MS"
                                            onChange={(e) => setForm({ ...form, cidade_estado: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Equipe / Família</label>
                                        <input className="form-input" value={form.equipe_familia}
                                            placeholder="Ex: Família Silva"
                                            onChange={(e) => setForm({ ...form, equipe_familia: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Peso (Kg)</label>
                                        <input className="form-input" type="number" step="0.1" value={form.peso}
                                            placeholder="Ex: 85.5"
                                            onChange={(e) => setForm({ ...form, peso: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Altura (m)</label>
                                        <input className="form-input" type="number" step="0.01" value={form.altura}
                                            placeholder="Ex: 1.80"
                                            onChange={(e) => setForm({ ...form, altura: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Biotipo</label>
                                        <input className="form-input" value={form.biotipo}
                                            placeholder="Ex: magro-sedentário"
                                            onChange={(e) => setForm({ ...form, biotipo: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Indicativo de Saúde (1 a 5)</label>
                                        <select className="form-select" value={form.indicativo_saude}
                                            onChange={(e) => setForm({ ...form, indicativo_saude: e.target.value })}>
                                            <option value="1">1 - Excelente/Atleta</option>
                                            <option value="2">2 - Bom</option>
                                            <option value="3">3 - Moderado/Intermediário</option>
                                            <option value="4">4 - Atenção/Sedentário</option>
                                            <option value="5">5 - Crítico/Alto Risco</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginTop: 32, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-critico)' }}>Ficha Clínica Essencial</h3>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--color-critico)' }}>Alergias / Restrições (Crítico)</label>
                                    <textarea className="form-input" rows={2} value={form.alergias}
                                        placeholder="Ex: Dipirona, Picada de Abelha, Nenhuma..."
                                        onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Condições Médicas / Comorbidades</label>
                                    <textarea className="form-input" rows={2} value={form.condicoes_medicas}
                                        placeholder="Ex: Hipertensão, Diabetes, Asma..."
                                        onChange={(e) => setForm({ ...form, condicoes_medicas: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Cirurgias Anteriores</label>
                                    <textarea className="form-input" rows={2} value={form.cirurgias}
                                        placeholder="Ex: Apendicite (2018), Joelho Direito (2020)..."
                                        onChange={(e) => setForm({ ...form, cirurgias: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Uso Contínuo de Medicamentos</label>
                                    <textarea className="form-input" rows={2} value={form.medicamentos}
                                        placeholder="Ex: Losartana 50mg, Insulina..."
                                        onChange={(e) => setForm({ ...form, medicamentos: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Observação Restritiva (Laudo Hakuna)</label>
                                    <textarea className="form-input" rows={2} value={form.observacao_hakuna}
                                        placeholder="Regras de liberação para a montanha..."
                                        onChange={(e) => setForm({ ...form, observacao_hakuna: e.target.value })} />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Plano de Saúde</label>
                                        <input className="form-input" value={form.plano_saude}
                                            placeholder="Ex: Unimed (Nacional)"
                                            onChange={(e) => setForm({ ...form, plano_saude: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Atividade Física Semanal</label>
                                        <input className="form-input" value={form.atividade_fisica_semanal}
                                            placeholder="Ex: Não Faço / 3x na semana"
                                            onChange={(e) => setForm({ ...form, atividade_fisica_semanal: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Outras Informações Médicas</label>
                                    <textarea className="form-input" rows={3} value={form.outras_informacoes_medicas}
                                        placeholder="Qualquer outro detalhe clínico relevante..."
                                        onChange={(e) => setForm({ ...form, outras_informacoes_medicas: e.target.value })} />
                                </div>

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
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
                    </div >
                )}

                {/* Participant View Modal */}
                {viewingParticipante && (
                    <div
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(4px)', zIndex: 10000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                        }}
                        onClick={() => setViewingParticipante(null)}
                    >
                        <div
                            className="card-static"
                            style={{ maxWidth: 600, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: '16px 0' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <button className="btn btn-icon btn-secondary" onClick={() => setViewingParticipante(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <ParticipantProfile participante={viewingParticipante} />
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
                                            <button className="btn btn-sm btn-secondary" title="Ver Perfil" onClick={() => setViewingParticipante(p)}>
                                                <Eye size={16} />
                                            </button>
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

                {
                    filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                            {search ? 'Nenhum participante encontrado.' : 'Nenhum participante cadastrado.'}
                        </div>
                    )
                }
            </div >
        </>
    );
}
