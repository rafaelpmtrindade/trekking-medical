'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPosition, GeoPosition } from '@/lib/geolocation';
import type { Participante, Gravidade } from '@/types/database';
import { GRAVIDADE_CONFIG } from '@/types/database';
import imageCompression from 'browser-image-compression';

function AtendimentoContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, medico, loading: authLoading } = useAuth();
    const tagId = searchParams.get('t');

    const [participante, setParticipante] = useState<Participante | null>(null);
    const [loadingParticipante, setLoadingParticipante] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // GPS
    const [gps, setGps] = useState<GeoPosition | null>(null);
    const [gpsLoading, setGpsLoading] = useState(true);
    const [gpsError, setGpsError] = useState('');

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
        if (!tagId) {
            setLoadingParticipante(false);
            setNotFound(true);
            return;
        }

        async function fetchParticipante() {
            const { data, error } = await supabase
                .from('participantes')
                .select('*')
                .eq('nfc_tag_id', tagId)
                .single();

            if (error || !data) {
                setNotFound(true);
            } else {
                setParticipante(data);
            }
            setLoadingParticipante(false);
        }

        fetchParticipante();
    }, [tagId]);

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
                        <span className="login-icon">🔐</span>
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
                    <span style={{ fontSize: '4rem', display: 'block', marginBottom: 16 }}>❌</span>
                    <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                        Participante não encontrado
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Tag NFC: <code>{tagId || 'não informada'}</code>
                    </p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="mobile-container">
                <div className="success-container" style={{ paddingTop: '80px' }}>
                    <span className="success-icon">✅</span>
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
                            📋 Novo Atendimento (mesmo participante)
                        </button>
                        <button
                            className="btn btn-secondary btn-lg"
                            onClick={() => router.push('/dashboard')}
                        >
                            📊 Ver Dashboard
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
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
                        🏔️ Atendimento
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
                        `📍 GPS: ${gps?.latitude.toFixed(6)}, ${gps?.longitude.toFixed(6)} (±${gps?.accuracy.toFixed(0)}m)`}
            </div>

            {/* Participant Card */}
            <div className="participant-card">
                <div className="participant-header">
                    <div className="participant-avatar">
                        {participante?.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="participant-name">{participante?.nome}</div>
                        <div className="participant-tag">🏷️ {participante?.nfc_tag_id}</div>
                    </div>
                </div>

                <div className="participant-info-grid">
                    {participante?.idade && (
                        <div className="participant-info-item">
                            <div className="participant-info-label">Idade</div>
                            <div className="participant-info-value">{participante.idade} anos</div>
                        </div>
                    )}
                    {participante?.tipo_sanguineo && (
                        <div className="participant-info-item">
                            <div className="participant-info-label">Tipo Sanguíneo</div>
                            <div className="participant-info-value">{participante.tipo_sanguineo}</div>
                        </div>
                    )}
                    {participante?.telefone_emergencia && (
                        <div className="participant-info-item">
                            <div className="participant-info-label">Tel. Emergência</div>
                            <div className="participant-info-value">{participante.telefone_emergencia}</div>
                        </div>
                    )}
                    {participante?.contato_emergencia_nome && (
                        <div className="participant-info-item">
                            <div className="participant-info-label">Contato Emergência</div>
                            <div className="participant-info-value">{participante.contato_emergencia_nome}</div>
                        </div>
                    )}
                </div>

                {participante?.alergias && (
                    <div className="alert-danger" style={{ marginTop: 12 }}>
                        <span>⚠️</span>
                        <div><strong>Alergias:</strong> {participante.alergias}</div>
                    </div>
                )}
                {participante?.condicoes_medicas && (
                    <div className="alert-warning">
                        <span>💊</span>
                        <div><strong>Condições:</strong> {participante.condicoes_medicas}</div>
                    </div>
                )}
                {participante?.medicamentos && (
                    <div className="alert-info">
                        <span>💉</span>
                        <div><strong>Medicamentos:</strong> {participante.medicamentos}</div>
                    </div>
                )}
            </div>

            {/* Atendimento Form */}
            <form onSubmit={handleSubmit}>
                <div className="card-static" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20, fontSize: '1.1rem' }}>
                        📝 Registro do Atendimento
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
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, fontSize: '1.1rem' }}>
                        📷 Fotos
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
                        <div className="photo-upload-icon">📸</div>
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
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {submitError && (
                    <div className="alert-danger" style={{ marginBottom: 16 }}>
                        <span>❌</span>
                        <div>{submitError}</div>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    disabled={submitting || !gps || gpsLoading}
                >
                    {submitting ? '⏳ Salvando...' :
                        !gps ? '📍 Aguardando GPS...' :
                            '✅ Registrar Atendimento'}
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
