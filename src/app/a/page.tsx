'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPosition, GeoPosition } from '@/lib/geolocation';
import type { Participante, Gravidade } from '@/types/database';
import { GRAVIDADE_CONFIG } from '@/types/database';
import ParticipantProfile from '@/components/ParticipantProfile';
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
    const { user, usuario, loading: authLoading } = useAuth();
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
        console.log('[DEBUG /a] useEffect triggered. tagId:', tagId, 'authLoading:', authLoading, 'user:', !!user, 'usuario:', !!usuario);

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
        if (!user || !usuario) {
            console.log('[DEBUG /a] Blocking fetch: user or usuario is missing. user:', !!user, 'usuario:', !!usuario);
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
                hasUsuario: !!usuario,
                usuarioId: usuario?.id,
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
    }, [tagId, authLoading, user, usuario]);

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
                    evento_id: participante.evento_id,
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

    if (!user || !usuario) {
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
                        Dr(a). {usuario.nome}
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
            {participante && <ParticipantProfile participante={participante} />}

            {/* Atendimento Form */}
            <form onSubmit={handleSubmit}>
                <div className="card-static" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={20} color="var(--color-primary)" /> Registro do Atendimento
                    </h3>

                    {/* Severity Selector */}
                    <div className="form-group">
                        <label className="form-label">Gravidade do Atendimento</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                            {(Object.keys(GRAVIDADE_CONFIG) as Gravidade[]).map((g) => (
                                <div
                                    key={g}
                                    style={{
                                        padding: '10px 4px',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        border: '1px solid',
                                        borderColor: gravidade === g ? GRAVIDADE_CONFIG[g].color : 'var(--color-border)',
                                        background: gravidade === g ? GRAVIDADE_CONFIG[g].bgColor : 'transparent',
                                        color: gravidade === g ? GRAVIDADE_CONFIG[g].color : 'var(--color-text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                    onClick={() => setGravidade(g)}
                                >
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
