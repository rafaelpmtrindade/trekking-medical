'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPosition, GeoPosition } from '@/lib/geolocation';
import type { Participante, Gravidade } from '@/types/database';
import { GRAVIDADE_CONFIG } from '@/types/database';
import imageCompression from 'browser-image-compression';
import {
    MountainSnow,
    Lock,
    XOctagon,
    CheckCircle,
    ClipboardList,
    BarChart2,
    MapPin,
    Tag,
    AlertTriangle,
    Pill,
    Syringe,
    Camera,
    X,
    FileText,
    Loader2,
    HeartPulse,
    Activity,
    Users,
    ShieldAlert,
    Info,
    Droplet,
    Stethoscope,
    Phone
} from 'lucide-react';

function AtendimentoContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, medico, loading: authLoading } = useAuth();
    const tagId = searchParams.get('t')?.trim() || null;

    const [participante, setParticipante] = useState<Participante | null>(null);
    const [loadingParticipante, setLoadingParticipante] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // GPS
    const [gps, setGps] = useState<GeoPosition | null>(null);
    const [gpsLoading, setGpsLoading] = useState(true);
    const [gpsError, setGpsError] = useState('');
    const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

    // Form
    const [descricao, setDescricao] = useState('');
    const [gravidade, setGravidade] = useState<Gravidade>('leve');
    const [observacoes, setObservacoes] = useState('');
    const [fotos, setFotos] = useState<File[]>([]);
    const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Submit state
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Fetch participant by NFC tag
    useEffect(() => {
        console.log('[DEBUG /a] useEffect triggered. tagId:', tagId, 'authLoading:', authLoading, 'user:', !!user, 'medico:', !!medico);

        if (!tagId) {
            console.log('[DEBUG /a] No tagId present, setting notFound to true');
            setLoadingParticipante(false);
            setNotFound(true);
            return;
        }

        // Wait for auth to initialize before fetching to avoid RLS failures
        if (authLoading) {
            console.log('[DEBUG /a] authLoading is true, waiting...');
            return;
        }

        // If not authenticated OR not verified as a medico, don't fetch (RLS will block it). 
        // Just stop loading so the login screen can be shown.
        if (!user || !medico) {
            console.log('[DEBUG /a] Blocking fetch: user or medico is missing. user:', !!user, 'medico:', !!medico);
            setLoadingParticipante(false);
            return;
        }

        async function fetchParticipante() {
            console.log('[DEBUG /a] Fetching participante from Supabase for tag:', tagId);
            setLoadingParticipante(true);
            const { data, error, status } = await supabase
                .from('participantes')
                .select('*')
                .eq('nfc_tag_id', tagId)
                .single();

            console.log('[DEBUG /a] Fetch result:', { data, error, status });

            setDebugInfo({
                tagSearched: tagId,
                authLoading,
                hasUser: !!user,
                userId: user?.id,
                hasMedico: !!medico,
                medicoId: medico?.id,
                error: error ? error.message : null,
                status,
                dataFound: !!data
            });

            if (error || !data) {
                console.log('[DEBUG /a] Participante not found or error occurred. Setting notFound:', true);
                setNotFound(true);
            } else {
                console.log('[DEBUG /a] Participante found successfully!');
                setParticipante(data);
                setNotFound(false); // Make sure to reset notFound if it succeeds on retry
            }
            setLoadingParticipante(false);
        }

        fetchParticipante();
    }, [tagId, authLoading, user, medico]);

    // Get GPS on mount
    useEffect(() => {
        async function getGPS() {
            try {
                const pos = await getCurrentPosition();
                setGps(pos);
                setGpsLoading(false);
            } catch (err) {
                setGpsError((err as Error).message);
                setGpsLoading(false);
            }
        }
        getGPS();
    }, []);

    // Photo handling
    async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const compressed: File[] = [];
        const previews: string[] = [];

        for (const file of files) {
            try {
                const comp = await imageCompression(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                });
                compressed.push(comp);
                previews.push(URL.createObjectURL(comp));
            } catch {
                compressed.push(file);
                previews.push(URL.createObjectURL(file));
            }
        }

        setFotos((prev) => [...prev, ...compressed]);
        setFotoPreviews((prev) => [...prev, ...previews]);
    }

    function removePhoto(index: number) {
        setFotos((prev) => prev.filter((_, i) => i !== index));
        setFotoPreviews((prev) => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    }

    // Submit
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!participante || !user || !gps) return;

        setSubmitting(true);
        setSubmitError('');

        try {
            // 1. Create atendimento
            const { data: atendimento, error: atError } = await supabase
                .from('atendimentos')
                .insert({
                    participante_id: participante.id,
                    medico_id: user.id,
                    descricao,
                    gravidade,
                    latitude: gps.latitude,
                    longitude: gps.longitude,
                    altitude: gps.altitude,
                    precisao_gps: gps.accuracy,
                    observacoes: observacoes || null,
                    status: 'em_andamento',
                })
                .select()
                .single();

            if (atError) throw atError;

            // 2. Upload photos
            for (const foto of fotos) {
                const fileName = `${atendimento.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('atendimento-fotos')
                    .upload(fileName, foto, { contentType: 'image/jpeg' });

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('atendimento-fotos')
                        .getPublicUrl(fileName);

                    await supabase.from('atendimento_fotos').insert({
                        atendimento_id: atendimento.id,
                        foto_url: urlData.publicUrl,
                    });
                }
            }

            setSuccess(true);
        } catch (err) {
            setSubmitError((err as Error).message || 'Erro ao salvar atendimento');
        } finally {
            setSubmitting(false);
        }
    }

    // Auth check
    if (authLoading || loadingParticipante) {
        return (
            <div className="mobile-container">
                <div className="loading-container" style={{ minHeight: '80vh' }}>
                    <div className="spinner" />
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        {loadingParticipante ? 'Identificando participante...' : 'Autenticando...'}
                    </p>
                </div>
            </div>
        );
    }

    if (!user || !medico) {
        return (
            <div className="mobile-container">
                <div className="login-card" style={{ maxWidth: 400, margin: '40px auto' }}>
                    <div className="login-header">
                        <span className="login-icon"><Lock size={48} /></span>
                        <h1 className="login-title">Acesso Restrito</h1>
                        <p className="login-subtitle">Faça login para registrar atendimentos</p>
                    </div>
                    <button
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        onClick={() => router.push(`/login?redirect=/a?t=${tagId}`)}
                    >
                        Fazer Login
                    </button>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="mobile-container">
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--color-critico)' }}><XOctagon size={64} /></span>
                    <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                        Participante não encontrado
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Tag NFC: <code>{tagId || 'não informada'}</code>
                    </p>

                    <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: 8, textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        <strong>Diagnostic Info:</strong>
                        <pre style={{ overflowX: 'auto', marginTop: 8 }}>{JSON.stringify(debugInfo, null, 2)}</pre>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="mobile-container">
                <div className="success-container" style={{ paddingTop: '80px' }}>
                    <span className="success-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-leve)' }}><CheckCircle size={64} /></span>
                    <h2 className="success-title">Atendimento Registrado!</h2>
                    <p className="success-message">
                        Dados de {participante?.nome} salvos com sucesso.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => {
                                setSuccess(false);
                                setDescricao('');
                                setObservacoes('');
                                setGravidade('leve');
                                setFotos([]);
                                setFotoPreviews([]);
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={20} /> Novo Atendimento (mesmo)</span>
                        </button>
                        <button
                            className="btn btn-secondary btn-lg"
                            onClick={() => router.push('/dashboard')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={20} /> Ver Dashboard</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mobile-container">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MountainSnow size={24} color="var(--color-primary)" /> Atendimento
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        Dr(a). {medico.nome}
                    </p>
                </div>
            </div>

            {/* GPS Indicator */}
            <div className="gps-indicator">
                <span className={`gps-dot ${gpsLoading ? 'loading' : gpsError ? 'error' : 'active'}`} />
                {gpsLoading ? 'Obtendo localização...' :
                    gpsError ? gpsError :
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> GPS: {gps?.latitude.toFixed(6)}, {gps?.longitude.toFixed(6)} (±{gps?.accuracy.toFixed(0)}m)</span>}
            </div>

            {/* Participant Card (Premium Medical Layout) */}
            <div className="participant-card" style={{ padding: 0, overflow: 'hidden' }}>

                {/* 1. HERO SECTION (Basic Info) */}
                <div style={{ padding: '20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div className="participant-avatar" style={{ width: 64, height: 64, fontSize: '1.8rem', flexShrink: 0 }}>
                            {participante?.nome.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2, color: 'var(--color-text)' }}>
                                {participante?.nome}
                            </h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={14} /> {participante?.nfc_tag_id}</span>
                                {participante?.idade && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>• {participante.idade} anos</span>}
                                {participante?.cidade_estado && <span style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>• {participante.cidade_estado}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. WARNING BADGES (Alergias / Hakuna) - HIGHEST PRIORITY */}
                {(participante?.alergias || participante?.observacao_hakuna) && (
                    <div style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {participante?.alergias && (
                            <div style={{ display: 'flex', gap: 8, color: 'var(--color-critico)', fontSize: '0.9rem', marginBottom: participante?.observacao_hakuna ? 8 : 0 }}>
                                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                                <div><strong style={{ display: 'block', marginBottom: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>ALERGIA GRAVE / RESTRIÇÃO</strong> {participante.alergias}</div>
                            </div>
                        )}
                        {participante?.observacao_hakuna && (
                            <div style={{ display: 'flex', gap: 8, color: 'var(--color-grave)', fontSize: '0.9rem' }}>
                                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                                <div><strong style={{ display: 'block', marginBottom: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>LAUDO HAKUNA</strong> {participante.observacao_hakuna}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. VITALS STRIP (Contrasting Darker Background) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#0f172a', padding: '16px 20px', gap: 12, borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sangue</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: participante?.tipo_sanguineo ? '#ef4444' : '#64748b' }}>
                            <Droplet size={14} style={{ display: 'inline', marginBottom: -1 }} /> {participante?.tipo_sanguineo || '--'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Peso</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                            {participante?.peso ? `${participante.peso}kg` : '--'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Altura</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                            {participante?.altura ? `${participante.altura}m` : '--'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>IMC</div>
                        {(() => {
                            if (!participante?.peso || !participante?.altura) return <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>--</div>;
                            const imc = participante.peso / (participante.altura * participante.altura);
                            let color = '#22c55e';
                            if (imc < 18.5) color = '#3b82f6';
                            else if (imc >= 25 && imc < 30) color = '#eab308';
                            else if (imc >= 30) color = '#ef4444';

                            return (
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>
                                    {imc.toFixed(1)}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* 4. HEALTH INDICATOR SCALE (1 to 5) */}
                {participante?.indicativo_saude && (
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Indicativo de Saúde</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {[1, 2, 3, 4, 5].map((level) => {
                                const isActive = level <= (participante.indicativo_saude || 0);
                                const isCurrent = level === (participante.indicativo_saude || 0);
                                let bg = 'var(--color-surface-hover)';
                                if (isActive) {
                                    if (level === 1) bg = '#22c55e';      // Green
                                    else if (level === 2) bg = '#84cc16'; // Lime
                                    else if (level === 3) bg = '#eab308'; // Yellow
                                    else if (level === 4) bg = '#f97316'; // Orange
                                    else if (level === 5) bg = '#ef4444'; // Red
                                }
                                return (
                                    <div key={level} style={{
                                        width: 32, height: 12, borderRadius: 2, background: bg,
                                        opacity: isActive ? 1 : 0.2,
                                        transform: isCurrent ? 'scaleY(1.3)' : 'scaleY(1)',
                                        transition: 'transform 0.2s',
                                        boxShadow: isCurrent ? '0 0 8px rgba(0,0,0,0.5)' : 'none'
                                    }} />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 5. CLINICAL DATA GRID (Comorbidades, Medicamentos, Cirurgias) */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {participante?.condicoes_medicas && (
                        <div>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><HeartPulse size={14} /> Condições / Comorbidades</div>
                            <div style={{ color: 'var(--color-text)', fontSize: '0.95rem', lineHeight: 1.4, background: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: 8 }}>
                                {participante.condicoes_medicas}
                            </div>
                        </div>
                    )}

                    {participante?.medicamentos && (
                        <div>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Pill size={14} /> Uso Contínuo</div>
                            <div style={{ color: 'var(--color-text)', fontSize: '0.95rem', lineHeight: 1.4, background: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: 8 }}>
                                {participante.medicamentos}
                            </div>
                        </div>
                    )}

                    {participante?.cirurgias && (
                        <div>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Stethoscope size={14} /> Cirurgias Prévias</div>
                            <div style={{ color: 'var(--color-text)', fontSize: '0.95rem', lineHeight: 1.4, background: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: 8 }}>
                                {participante.cirurgias}
                            </div>
                        </div>
                    )}

                    {/* Meta/Lifestyle Info (Compact Grid) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                        {participante?.biotipo && (
                            <div style={{ background: 'var(--color-surface-hover)', padding: '10px', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Biotipo</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text)' }}>{participante.biotipo}</div>
                            </div>
                        )}
                        {participante?.atividade_fisica_semanal && (
                            <div style={{ background: 'var(--color-surface-hover)', padding: '10px', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Atividade Física</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={12} /> {participante.atividade_fisica_semanal}</div>
                            </div>
                        )}
                        {participante?.plano_saude && (
                            <div style={{ background: 'var(--color-surface-hover)', padding: '10px', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Plano de Saúde</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text)' }}>{participante.plano_saude}</div>
                            </div>
                        )}
                        {participante?.equipe_familia && (
                            <div style={{ background: 'var(--color-surface-hover)', padding: '10px', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Equipe / Família</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {participante.equipe_familia}</div>
                            </div>
                        )}
                    </div>

                    {participante?.outras_informacoes_medicas && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Info size={14} /> Outras Informações</div>
                            <div style={{ color: 'var(--color-text)', fontSize: '0.9rem', lineHeight: 1.4, borderLeft: '2px solid var(--color-border)', paddingLeft: 12 }}>
                                {participante.outras_informacoes_medicas}
                            </div>
                        </div>
                    )}

                    {/* Emergency Contacts (Bottom of card) */}
                    {(participante?.telefone_emergencia || participante?.contato_emergencia_nome) && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--color-border)', display: 'flex', gap: 12, alignItems: 'center', color: 'var(--color-text-secondary)' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Phone size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Emergência</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                                    {participante?.contato_emergencia_nome} {participante?.contato_emergencia_nome && participante?.telefone_emergencia && '•'} <a href={`tel:${participante?.telefone_emergencia}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{participante?.telefone_emergencia}</a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Atendimento Form */}
            <form onSubmit={handleSubmit}>
                <div className="card-static" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={20} color="var(--color-primary)" /> Registro do Atendimento
                    </h3>

                    {/* Severity Selector */}
                    <div className="form-group">
                        <label className="form-label">Gravidade</label>
                        <div className="severity-selector">
                            {(Object.keys(GRAVIDADE_CONFIG) as Gravidade[]).map((g) => (
                                <div
                                    key={g}
                                    className={`severity-option ${gravidade === g ? 'selected' : ''}`}
                                    style={{
                                        borderColor: gravidade === g ? GRAVIDADE_CONFIG[g].color : undefined,
                                        background: gravidade === g ? GRAVIDADE_CONFIG[g].bgColor : undefined,
                                        color: gravidade === g ? GRAVIDADE_CONFIG[g].color : undefined,
                                    }}
                                    onClick={() => setGravidade(g)}
                                >
                                    <span className="severity-icon">{GRAVIDADE_CONFIG[g].icon}</span>
                                    {GRAVIDADE_CONFIG[g].label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">Descrição do Atendimento *</label>
                        <textarea
                            className="form-textarea"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Descreva os sintomas, procedimentos realizados..."
                            required
                        />
                    </div>

                    {/* Observations */}
                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea
                            className="form-textarea"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Observações adicionais..."
                            style={{ minHeight: 80 }}
                        />
                    </div>
                </div>

                {/* Photos */}
                <div className="card-static" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Camera size={20} color="var(--color-primary)" /> Fotos
                    </h3>

                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                    />

                    <div
                        className="photo-upload-area"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="photo-upload-icon"><Camera size={32} /></div>
                        <div className="photo-upload-text">
                            Toque para tirar foto ou selecionar da galeria
                        </div>
                    </div>

                    {fotoPreviews.length > 0 && (
                        <div className="photo-preview-grid">
                            {fotoPreviews.map((url, i) => (
                                <div key={i} className="photo-preview">
                                    <img src={url} alt={`Foto ${i + 1}`} />
                                    <button
                                        type="button"
                                        className="photo-preview-remove"
                                        onClick={() => removePhoto(i)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {submitError && (
                    <div className="alert-danger" style={{ marginBottom: 16 }}>
                        <XOctagon size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>{submitError}</div>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    disabled={submitting || !gps || gpsLoading}
                >
                    {submitting ? <><Loader2 className="animate-spin" size={20} /> Salvando...</> :
                        !gps ? <><MapPin size={20} /> Aguardando GPS...</> :
                            <><CheckCircle size={20} /> Registrar Atendimento</>}
                </button>
            </form>
        </div>
    );
}

export default function AtendimentoPage() {
    return (
        <Suspense fallback={
            <div className="mobile-container">
                <div className="loading-container" style={{ minHeight: '80vh' }}>
                    <div className="spinner" />
                </div>
            </div>
        }>
            <AtendimentoContent />
        </Suspense>
    );
}
