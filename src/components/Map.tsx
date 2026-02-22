'use client';

import dynamic from 'next/dynamic';
import type { Atendimento } from '@/types/database';
import { GRAVIDADE_CONFIG } from '@/types/database';

const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

// Marker size by severity
const MARKER_SIZE: Record<string, number> = {
    critico: 36,
    grave: 32,
    moderado: 28,
    leve: 24,
};

// Health indicator colors (1=red/critical → 5=blue/healthy)
const INDICATIVO_COLORS: Record<number, string> = {
    1: '#ef4444',
    2: '#f97316',
    3: '#eab308',
    4: '#22c55e',
    5: '#3b82f6',
};

interface MapProps {
    atendimentos: Atendimento[];
    center?: [number, number];
    zoom?: number;
    newMarkerIds?: string[];
    onMarkerClick?: (atendimento: Atendimento) => void;
}

function getAnimatedMarkerIcon(atendimento: Atendimento, isNew: boolean) {
    if (typeof window === 'undefined') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');

    const gravidade = atendimento.gravidade;
    const config = GRAVIDADE_CONFIG[gravidade as keyof typeof GRAVIDADE_CONFIG];
    const size = MARKER_SIZE[gravidade] || 28;
    const color = config?.color || '#94a3b8';

    // Outer ring color based on indicativo_saude (if available)
    const indicativo = atendimento.participante?.indicativo_saude;
    const ringColor = indicativo ? (INDICATIVO_COLORS[indicativo] || '#94a3b8') : color;

    // Show pulse ring for critical/grave or new markers
    const showPulse = gravidade === 'critico' || gravidade === 'grave';
    const newClass = isNew ? 'marker-new' : '';

    const pulseHTML = showPulse
        ? `<div class="marker-pulse-ring" style="width:${size + 16}px;height:${size + 16}px;color:${color};top:${-(8)}px;left:${-(8)}px;"></div>`
        : '';

    // Ring border to indicate indicativo_saude
    const ringBorder = indicativo ? `box-shadow: 0 0 0 3px ${ringColor}, 0 2px 8px rgba(0,0,0,0.5);` : `box-shadow: 0 2px 8px rgba(0,0,0,0.5);`;

    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-wrapper ${newClass}" style="width:${size + 16}px;height:${size + 16}px;">
            ${pulseHTML}
            <div class="marker-dot" style="width:${size}px;height:${size}px;background:${color};border:3px solid #fff;${ringBorder}"></div>
        </div>`,
        iconSize: [size + 16, size + 16],
        iconAnchor: [(size + 16) / 2, (size + 16) / 2],
        popupAnchor: [0, -(size / 2 + 4)],
    });
}

export default function Map({ atendimentos, center, zoom = 13, newMarkerIds = [], onMarkerClick }: MapProps) {
    const defaultCenter: [number, number] = center || (
        atendimentos.length > 0
            ? [atendimentos[0].latitude, atendimentos[0].longitude]
            : [-20.3155, -43.8695] // Default: Ouro Preto, MG
    );

    return (
        <div className="map-container">
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                crossOrigin=""
            />
            <MapContainer
                center={defaultCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {atendimentos.map((at) => {
                    const isNew = newMarkerIds.includes(at.id);
                    return (
                        <Marker
                            key={at.id}
                            position={[at.latitude, at.longitude]}
                            icon={getAnimatedMarkerIcon(at, isNew)}
                            eventHandlers={onMarkerClick ? {
                                click: () => onMarkerClick(at),
                            } : undefined}
                        >
                            <Popup>
                                <div style={{ minWidth: 220, fontFamily: 'Inter, sans-serif' }}>
                                    <strong style={{ fontSize: '1rem' }}>
                                        {at.participante?.nome || 'Participante'}
                                    </strong>

                                    {/* Indicativo de Saúde */}
                                    {at.participante?.indicativo_saude && (
                                        <div style={{ display: 'flex', gap: 3, margin: '6px 0 4px', width: '100%' }}>
                                            {[1, 2, 3, 4, 5].map((lvl) => (
                                                <div key={lvl} style={{
                                                    flex: 1, height: 6, borderRadius: 2,
                                                    background: INDICATIVO_COLORS[lvl] || '#94a3b8',
                                                    opacity: lvl <= (at.participante?.indicativo_saude || 0) ? 1 : 0.2,
                                                }} />
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ margin: '6px 0' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: GRAVIDADE_CONFIG[at.gravidade]?.bgColor,
                                            color: GRAVIDADE_CONFIG[at.gravidade]?.color,
                                        }}>
                                            {GRAVIDADE_CONFIG[at.gravidade]?.icon} {GRAVIDADE_CONFIG[at.gravidade]?.label}
                                        </span>
                                    </div>

                                    <p style={{ fontSize: '0.85rem', color: '#334155', margin: '4px 0' }}>
                                        {at.descricao}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {new Date(at.created_at).toLocaleString('pt-BR')}
                                    </p>
                                    {at.medico && (
                                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            Dr(a). {at.medico.nome}
                                        </p>
                                    )}
                                    {at.fotos && at.fotos.length > 0 && (
                                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                                            {at.fotos.map((f) => (
                                                <img
                                                    key={f.id}
                                                    src={f.foto_url}
                                                    alt="Foto do atendimento"
                                                    style={{
                                                        width: 60,
                                                        height: 60,
                                                        objectFit: 'cover',
                                                        borderRadius: 6,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
