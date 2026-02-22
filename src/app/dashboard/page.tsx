'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import type { Atendimento } from '@/types/database';
import { GRAVIDADE_CONFIG, Gravidade } from '@/types/database';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function DashboardPage() {
    const { user, medico, loading: authLoading } = useAuth();
    const router = useRouter();

    const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroGravidade, setFiltroGravidade] = useState<string>('todos');
    const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);

    // Stats
    const [totalParticipantes, setTotalParticipantes] = useState(0);
    const [totalMedicos, setTotalMedicos] = useState(0);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Fetch data
    useEffect(() => {
        if (!user) return;

        async function fetchData() {
            // Fetch atendimentos with joins
            const { data: atData } = await supabase
                .from('atendimentos')
                .select(`
          *,
          participante:participantes(*),
          medico:medicos(*),
          fotos:atendimento_fotos(*)
        `)
                .order('created_at', { ascending: false });

            if (atData) setAtendimentos(atData);

            // Fetch counts
            const { count: partCount } = await supabase
                .from('participantes')
                .select('*', { count: 'exact', head: true });

            const { count: medCount } = await supabase
                .from('medicos')
                .select('*', { count: 'exact', head: true });

            setTotalParticipantes(partCount || 0);
            setTotalMedicos(medCount || 0);
            setLoading(false);
        }

        fetchData();

        // Realtime subscription
        const channel = supabase
            .channel('atendimentos-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'atendimentos',
            }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const filteredAtendimentos = filtroGravidade === 'todos'
        ? atendimentos
        : atendimentos.filter((a) => a.gravidade === filtroGravidade);

    const countByGravidade = (g: Gravidade) => atendimentos.filter((a) => a.gravidade === g).length;

    if (authLoading || loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <p style={{ color: 'var(--color-text-secondary)' }}>Carregando dashboard...</p>
            </div>
        );
    }

    return (
        <>
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-inner">
                    <a className="navbar-brand" href="/dashboard">
                        <span className="navbar-brand-icon">🏔️</span>
                        <span className="navbar-brand-text">Trekking Medical</span>
                    </a>
                    <div className="navbar-links">
                        <a href="/dashboard" className="navbar-link active">Dashboard</a>
                        <a href="/admin/participantes" className="navbar-link">Participantes</a>
                        <a href="/admin/medicos" className="navbar-link">Médicos</a>
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                                supabase.auth.signOut();
                                router.push('/login');
                            }}
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </nav>

            <div className="app-container">
                <div className="page-header">
                    <h1 className="page-title">Dashboard de Atendimentos</h1>
                    <p className="page-subtitle">
                        Monitoramento em tempo real dos atendimentos médicos
                    </p>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(5,150,105,0.15)', color: 'var(--color-primary)' }}>
                            📊
                        </div>
                        <div>
                            <div className="stat-value">{atendimentos.length}</div>
                            <div className="stat-label">Total Atendimentos</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)', color: 'var(--color-accent)' }}>
                            👥
                        </div>
                        <div>
                            <div className="stat-value">{totalParticipantes}</div>
                            <div className="stat-label">Participantes</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                            🩺
                        </div>
                        <div>
                            <div className="stat-value">{totalMedicos}</div>
                            <div className="stat-label">Médicos</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                            🔴
                        </div>
                        <div>
                            <div className="stat-value">{countByGravidade('critico') + countByGravidade('grave')}</div>
                            <div className="stat-label">Graves / Críticos</div>
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="card-static dashboard-full" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
                            🗺️ Mapa de Atendimentos
                        </h2>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className={`btn btn-sm ${filtroGravidade === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFiltroGravidade('todos')}
                            >
                                Todos
                            </button>
                            {(Object.keys(GRAVIDADE_CONFIG) as Gravidade[]).map((g) => (
                                <button
                                    key={g}
                                    className={`btn btn-sm ${filtroGravidade === g ? 'btn-primary' : 'btn-secondary'}`}
                                    style={filtroGravidade === g ? { background: GRAVIDADE_CONFIG[g].color } : {}}
                                    onClick={() => setFiltroGravidade(g)}
                                >
                                    {GRAVIDADE_CONFIG[g].icon} {countByGravidade(g)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Map atendimentos={filteredAtendimentos} />
                </div>

                {/* Atendimentos List */}
                <div className="card-static" style={{ marginBottom: 32 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 16 }}>
                        📋 Lista de Atendimentos ({filteredAtendimentos.length})
                    </h2>

                    {filteredAtendimentos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>📭</span>
                            Nenhum atendimento registrado ainda.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Horário</th>
                                        <th>Participante</th>
                                        <th>Gravidade</th>
                                        <th>Médico(a)</th>
                                        <th>Status</th>
                                        <th>Fotos</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAtendimentos.map((at) => (
                                        <tr key={at.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {new Date(at.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td>
                                                <strong>{at.participante?.nome}</strong>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${at.gravidade}`}>
                                                    {GRAVIDADE_CONFIG[at.gravidade]?.icon} {GRAVIDADE_CONFIG[at.gravidade]?.label}
                                                </span>
                                            </td>
                                            <td>{at.medico?.nome}</td>
                                            <td>
                                                <span style={{
                                                    textTransform: 'capitalize',
                                                    color: at.status === 'em_andamento' ? '#f59e0b' :
                                                        at.status === 'finalizado' ? '#22c55e' : '#0ea5e9'
                                                }}>
                                                    {at.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{at.fotos?.length || 0} 📷</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => setSelectedAtendimento(at)}
                                                >
                                                    Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedAtendimento && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                    }}
                    onClick={() => setSelectedAtendimento(null)}
                >
                    <div
                        className="card-static"
                        style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                                    {selectedAtendimento.participante?.nome}
                                </h2>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                    {new Date(selectedAtendimento.created_at).toLocaleString('pt-BR')}
                                </p>
                            </div>
                            <button
                                className="btn btn-icon btn-secondary"
                                onClick={() => setSelectedAtendimento(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <span className={`badge badge-${selectedAtendimento.gravidade}`}>
                                {GRAVIDADE_CONFIG[selectedAtendimento.gravidade]?.icon}{' '}
                                {GRAVIDADE_CONFIG[selectedAtendimento.gravidade]?.label}
                            </span>
                            <span className="badge" style={{
                                background: 'rgba(148,163,184,0.15)',
                                color: '#94a3b8',
                                border: '1px solid rgba(148,163,184,0.3)',
                            }}>
                                🩺 Dr(a). {selectedAtendimento.medico?.nome}
                            </span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descrição</label>
                            <p style={{ lineHeight: 1.6 }}>{selectedAtendimento.descricao}</p>
                        </div>

                        {selectedAtendimento.observacoes && (
                            <div className="form-group">
                                <label className="form-label">Observações</label>
                                <p style={{ lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                                    {selectedAtendimento.observacoes}
                                </p>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Localização</label>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-accent)' }}>
                                📍 {selectedAtendimento.latitude.toFixed(6)}, {selectedAtendimento.longitude.toFixed(6)}
                                {selectedAtendimento.altitude && ` | Alt: ${selectedAtendimento.altitude.toFixed(0)}m`}
                                {selectedAtendimento.precisao_gps && ` | ±${selectedAtendimento.precisao_gps.toFixed(0)}m`}
                            </p>
                        </div>

                        {selectedAtendimento.fotos && selectedAtendimento.fotos.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Fotos ({selectedAtendimento.fotos.length})</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                                    {selectedAtendimento.fotos.map((f) => (
                                        <img
                                            key={f.id}
                                            src={f.foto_url}
                                            alt={f.legenda || 'Foto do atendimento'}
                                            style={{
                                                width: '100%',
                                                borderRadius: 8,
                                                objectFit: 'cover',
                                                aspectRatio: '4/3',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Participant medical info */}
                        {selectedAtendimento.participante && (
                            <div style={{ marginTop: 16, padding: 16, background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                                <label className="form-label" style={{ marginBottom: 12 }}>Dados do Participante</label>
                                <div className="participant-info-grid">
                                    {selectedAtendimento.participante.idade && (
                                        <div className="participant-info-item">
                                            <div className="participant-info-label">Idade</div>
                                            <div className="participant-info-value">{selectedAtendimento.participante.idade} anos</div>
                                        </div>
                                    )}
                                    {selectedAtendimento.participante.tipo_sanguineo && (
                                        <div className="participant-info-item">
                                            <div className="participant-info-label">Tipo Sanguíneo</div>
                                            <div className="participant-info-value">{selectedAtendimento.participante.tipo_sanguineo}</div>
                                        </div>
                                    )}
                                    {selectedAtendimento.participante.alergias && (
                                        <div className="participant-info-item" style={{ gridColumn: '1 / -1' }}>
                                            <div className="participant-info-label">Alergias</div>
                                            <div className="participant-info-value" style={{ color: '#ef4444' }}>{selectedAtendimento.participante.alergias}</div>
                                        </div>
                                    )}
                                    {selectedAtendimento.participante.condicoes_medicas && (
                                        <div className="participant-info-item" style={{ gridColumn: '1 / -1' }}>
                                            <div className="participant-info-label">Condições Médicas</div>
                                            <div className="participant-info-value">{selectedAtendimento.participante.condicoes_medicas}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
