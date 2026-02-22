'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import type { Atendimento, StatusAtendimento } from '@/types/database';
import { GRAVIDADE_CONFIG, Gravidade } from '@/types/database';
import ParticipantProfile from '@/components/ParticipantProfile';
import {
    MountainSnow,
    Activity,
    Users,
    Stethoscope,
    AlertTriangle,
    MapPin,
    List,
    InboxIcon,
    Image as ImageIcon,
    X,
    Info,
    FileText,
    Clock,
    Zap
} from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

// Toast notification type
interface Toast {
    id: string;
    nome: string;
    gravidade: Gravidade;
    medico: string;
    time: string;
    exiting?: boolean;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroGravidade, setFiltroGravidade] = useState<string>('todos');
    const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);

    // Stats
    const [totalParticipantes, setTotalParticipantes] = useState(0);
    const [totalMedicos, setTotalMedicos] = useState(0);

    // Realtime animation state
    const [newMarkerIds, setNewMarkerIds] = useState<string[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [flashCards, setFlashCards] = useState<Set<string>>(new Set());
    const [newTimelineIds, setNewTimelineIds] = useState<Set<string>>(new Set());
    const initialLoadDone = useRef(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!user) return;

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

        const { count: partCount } = await supabase
            .from('participantes')
            .select('*', { count: 'exact', head: true });

        const { count: medCount } = await supabase
            .from('medicos')
            .select('*', { count: 'exact', head: true });

        setTotalParticipantes(partCount || 0);
        setTotalMedicos(medCount || 0);
        setLoading(false);
        initialLoadDone.current = true;
    }, [user]);

    // Add toast
    const addToast = useCallback((at: Atendimento) => {
        const toast: Toast = {
            id: at.id,
            nome: at.participante?.nome || 'Participante',
            gravidade: at.gravidade,
            medico: at.medico?.nome || 'Médico',
            time: new Date(at.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setToasts(prev => [toast, ...prev].slice(0, 3));
        // Auto-dismiss after 5s  
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 300);
        }, 5000);
    }, []);

    // Flash stat cards
    const flashStatCards = useCallback(() => {
        setFlashCards(new Set(['total', 'andamento', 'criticos']));
        setTimeout(() => setFlashCards(new Set()), 800);
    }, []);

    useEffect(() => {
        if (!user) return;

        fetchData();

        // Realtime subscription
        const channel = supabase
            .channel('atendimentos-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'atendimentos',
            }, async (payload) => {
                // Fetch the full atendimento with joins
                const { data: fullAt } = await supabase
                    .from('atendimentos')
                    .select(`
                        *,
                        participante:participantes(*),
                        medico:medicos(*),
                        fotos:atendimento_fotos(*)
                    `)
                    .eq('id', payload.new.id)
                    .single();

                if (fullAt && initialLoadDone.current) {
                    // Add to state
                    setAtendimentos(prev => [fullAt, ...prev]);

                    // Animate marker
                    setNewMarkerIds(prev => [...prev, fullAt.id]);
                    setTimeout(() => {
                        setNewMarkerIds(prev => prev.filter(id => id !== fullAt.id));
                    }, 3000);

                    // Toast notification
                    addToast(fullAt);

                    // Flash stat cards
                    flashStatCards();

                    // Timeline animation
                    setNewTimelineIds(prev => new Set(prev).add(fullAt.id));
                    setTimeout(() => {
                        setNewTimelineIds(prev => {
                            const next = new Set(prev);
                            next.delete(fullAt.id);
                            return next;
                        });
                    }, 1000);
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'atendimentos',
            }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchData, addToast, flashStatCards]);

    const updateStatus = async (novoStatus: StatusAtendimento) => {
        if (!selectedAtendimento) return;
        const { error } = await supabase.from('atendimentos').update({ status: novoStatus }).eq('id', selectedAtendimento.id);
        if (!error) {
            setSelectedAtendimento({ ...selectedAtendimento, status: novoStatus });
            fetchData();
        }
    };

    const filteredAtendimentos = filtroGravidade === 'todos'
        ? atendimentos
        : atendimentos.filter((a) => a.gravidade === filtroGravidade);

    const countByGravidade = (g: Gravidade) => atendimentos.filter((a) => a.gravidade === g).length;
    const countByStatus = (s: string) => atendimentos.filter((a) => a.status === s).length;

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
            {/* Toast Notifications */}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`toast ${toast.exiting ? 'toast-exit' : ''}`}
                        onClick={() => {
                            const at = atendimentos.find(a => a.id === toast.id);
                            if (at) setSelectedAtendimento(at);
                        }}
                    >
                        <div
                            className="toast-dot"
                            style={{ background: GRAVIDADE_CONFIG[toast.gravidade]?.color || '#94a3b8' }}
                        />
                        <div className="toast-content">
                            <div className="toast-title">
                                {GRAVIDADE_CONFIG[toast.gravidade]?.icon} {toast.nome}
                            </div>
                            <div className="toast-subtitle">
                                Dr(a). {toast.medico} • {GRAVIDADE_CONFIG[toast.gravidade]?.label}
                            </div>
                        </div>
                        <div className="toast-time">{toast.time}</div>
                    </div>
                ))}
            </div>

            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-inner">
                    <a className="navbar-brand" href="/dashboard">
                        <span className="navbar-brand-icon"><MountainSnow size={24} /></span>
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
                <div className="page-header" style={{ position: 'relative', overflow: 'hidden', padding: '32px 24px', borderRadius: 'var(--radius-xl)', marginBottom: 32, background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(3,7,18,0) 100%)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-inner)' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '2.5rem' }}>
                            <span style={{
                                background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'inline-block'
                            }}>
                                Dashboard
                            </span>
                        </h1>
                        <p className="page-subtitle" style={{ fontSize: '1.1rem', color: '#94a3b8' }}>
                            Monitoramento em tempo real dos atendimentos médicos
                        </p>
                    </div>
                    {/* Decorative Background Elements */}
                    <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 1, pointerEvents: 'none' }} />
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    <div className={`stat-card ${flashCards.has('total') ? 'stat-flash' : ''}`}>
                        <div className="stat-icon" style={{ background: 'rgba(5,150,105,0.15)', color: 'var(--color-primary)' }}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{atendimentos.length}</div>
                            <div className="stat-label">Total</div>
                        </div>
                    </div>
                    <div className={`stat-card ${flashCards.has('andamento') ? 'stat-flash' : ''}`}>
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                            <Zap size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{countByStatus('em_andamento')}</div>
                            <div className="stat-label">Em Andamento</div>
                        </div>
                    </div>
                    <div className={`stat-card ${flashCards.has('criticos') ? 'stat-flash' : ''}`}>
                        <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{countByGravidade('critico') + countByGravidade('grave')}</div>
                            <div className="stat-label">Graves / Críticos</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)', color: 'var(--color-accent)' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{totalParticipantes}</div>
                            <div className="stat-label">Participantes</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                            <Stethoscope size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{totalMedicos}</div>
                            <div className="stat-label">Médicos</div>
                        </div>
                    </div>
                </div>

                {/* Timeline Feed */}
                {atendimentos.length > 0 && (
                    <div className="card-static" style={{ marginBottom: 24 }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 12,
                            display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)'
                        }}>
                            <Clock size={16} color="var(--color-primary)" /> Últimos Atendimentos
                        </h2>
                        <div className="timeline-strip">
                            {atendimentos.slice(0, 10).map((at) => (
                                <div
                                    key={at.id}
                                    className={`timeline-item ${newTimelineIds.has(at.id) ? 'timeline-new' : ''}`}
                                    onClick={() => setSelectedAtendimento(at)}
                                >
                                    <div className="timeline-time">
                                        {new Date(at.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="timeline-name">{at.participante?.nome || '—'}</div>
                                    <div className="timeline-meta">
                                        <div className="timeline-meta-dot" style={{ background: GRAVIDADE_CONFIG[at.gravidade]?.color }} />
                                        {GRAVIDADE_CONFIG[at.gravidade]?.label}
                                        <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                                        Dr(a). {at.medico?.nome || '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Map */}
                <div className="card-static dashboard-full" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin size={20} color="var(--color-primary)" /> Mapa de Atendimentos
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
                    <Map
                        atendimentos={filteredAtendimentos}
                        newMarkerIds={newMarkerIds}
                        onMarkerClick={(at) => setSelectedAtendimento(at)}
                    />
                </div>

                {/* Atendimentos List */}
                <div className="card-static" style={{ marginBottom: 32 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <List size={20} color="var(--color-primary)" /> Lista de Atendimentos ({filteredAtendimentos.length})
                    </h2>

                    {filteredAtendimentos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                            <center><InboxIcon size={48} style={{ marginBottom: 12, opacity: 0.5 }} /></center>
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
                                        <tr key={at.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAtendimento(at)}>
                                            <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                                {new Date(at.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: 16,
                                                        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', flexShrink: 0
                                                    }}>
                                                        {at.participante?.nome?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <strong style={{ fontSize: '0.95rem' }}>{at.participante?.nome}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${at.gravidade}`} style={{ padding: '4px 10px' }}>
                                                    {GRAVIDADE_CONFIG[at.gravidade]?.icon} {GRAVIDADE_CONFIG[at.gravidade]?.label}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{at.medico?.nome}</td>
                                            <td>
                                                <span style={{
                                                    textTransform: 'uppercase',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '4px 8px',
                                                    borderRadius: 16,
                                                    background: at.status === 'em_andamento' ? 'rgba(245,158,11,0.1)' :
                                                        at.status === 'finalizado' ? 'rgba(34,197,94,0.1)' : 'rgba(14,165,233,0.1)',
                                                    color: at.status === 'em_andamento' ? '#f59e0b' :
                                                        at.status === 'finalizado' ? '#22c55e' : '#0ea5e9'
                                                }}>
                                                    {at.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '16px' }}>{at.fotos?.length || 0} <ImageIcon size={16} /></td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                                                >
                                                    Abrir
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
                        zIndex: 10000,
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
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <span className={`badge badge-${selectedAtendimento.gravidade}`}>
                                {GRAVIDADE_CONFIG[selectedAtendimento.gravidade]?.label}
                            </span>
                            <span className="badge" style={{
                                background: 'rgba(148,163,184,0.15)',
                                color: '#94a3b8',
                                border: '1px solid rgba(148,163,184,0.3)',
                                display: 'flex',
                                gap: 6,
                                alignItems: 'center'
                            }}>
                                <Stethoscope size={14} /> Dr(a). {selectedAtendimento.medico?.nome}
                            </span>
                            <span style={{
                                padding: '4px 8px', borderRadius: 16, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                                background: selectedAtendimento.status === 'em_andamento' ? 'rgba(245,158,11,0.15)' :
                                    selectedAtendimento.status === 'finalizado' ? 'rgba(34,197,94,0.15)' : 'rgba(14,165,233,0.15)',
                                color: selectedAtendimento.status === 'em_andamento' ? '#f59e0b' :
                                    selectedAtendimento.status === 'finalizado' ? '#22c55e' : '#0ea5e9'
                            }}>
                                {selectedAtendimento.status?.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Descrição</label>
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
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> Localização</label>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-accent)' }}>
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
                            <ParticipantProfile participante={selectedAtendimento.participante} />
                        )}

                        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            {selectedAtendimento.status === 'em_andamento' && (
                                <>
                                    <button className="btn btn-secondary" onClick={() => updateStatus('encaminhado')}>
                                        Encaminhar
                                    </button>
                                    <button className="btn btn-primary" style={{ background: '#22c55e', borderColor: '#22c55e', color: '#fff' }} onClick={() => updateStatus('finalizado')}>
                                        Dar Baixa (Finalizar)
                                    </button>
                                </>
                            )}
                            {selectedAtendimento.status !== 'em_andamento' && (
                                <button className="btn btn-secondary" onClick={() => updateStatus('em_andamento')}>
                                    Reabrir Atendimento
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
