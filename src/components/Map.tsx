'use client';

import { useEffect, useState } from 'react';
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

// Internal component that uses useMap — must be a child of MapContainer
const MapController = dynamic(
    () => import('react-leaflet').then((mod) => {
        const { useMap } = mod;
        // eslint-disable-next-line react/display-name
        return ({ atendimentos, flyToId }: { atendimentos: Atendimento[]; flyToId?: string }) => {
            const map = useMap();

            // FitBounds on initial load (when atendimentos first arrive)
            useEffect(() => {
                if (atendimentos.length === 0) return;
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const L = require('leaflet');
                const bounds = L.latLngBounds(
                    atendimentos.map((at: Atendimento) => [at.latitude, at.longitude])
                );
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
                }
                // Only trigger on first load (atendimentos array reference)
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [atendimentos.length > 0]);

            // FlyTo new marker
            useEffect(() => {
                if (!flyToId) return;
                const at = atendimentos.find(a => a.id === flyToId);
                if (at) {
                    map.flyTo([at.latitude, at.longitude], 15, { duration: 1.2 });
                }
            }, [flyToId, atendimentos, map]);

            return null;
        };
    }),
    { ssr: false }
);

// Tile layer configs
const TILE_LAYERS = {
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        label: '🛰 Satélite',
    },
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        label: '🗺 Mapa',
    },
};

// Marker size by severity
const MARKER_SIZE: Record<string, number> = {
    critico: 36,
    grave: 32,
    moderado: 28,
    leve: 24,
};

// Health indicator colors
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
    flyToId?: string;
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

    const indicativo = atendimento.participante?.indicativo_saude;
    const ringColor = indicativo ? (INDICATIVO_COLORS[indicativo] || '#94a3b8') : color;

    const showPulse = gravidade === 'critico' || gravidade === 'grave';
    const newClass = isNew ? 'marker-new' : '';

    const pulseHTML = showPulse
        ? `<div class="marker-pulse-ring" style="width:${size + 16}px;height:${size + 16}px;color:${color};top:${-(8)}px;left:${-(8)}px;"></div>`
        : '';

    const ringBorder = indicativo
        ? `box-shadow: 0 0 0 3px ${ringColor}, 0 2px 8px rgba(0,0,0,0.5);`
        : `box-shadow: 0 2px 8px rgba(0,0,0,0.5);`;

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

export default function Map({ atendimentos, center, zoom = 15, newMarkerIds = [], flyToId, onMarkerClick }: MapProps) {
    const [tileMode, setTileMode] = useState<'satellite' | 'street'>('satellite');
    const tile = TILE_LAYERS[tileMode];

    const defaultCenter: [number, number] = center || (
        atendimentos.length > 0
            ? [atendimentos[0].latitude, atendimentos[0].longitude]
            : [-20.3155, -43.8695]
    );

    return (
        <div className="map-container" style={{ position: 'relative' }}>
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                crossOrigin=""
            />

            {/* Layer Toggle Button */}
            <div style={{
                position: 'absolute', top: 10, right: 10, zIndex: 1000,
                display: 'flex', gap: 4,
            }}>
                {(Object.keys(TILE_LAYERS) as Array<'satellite' | 'street'>).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setTileMode(mode)}
                        style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            background: tileMode === mode ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            backdropFilter: 'blur(4px)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {TILE_LAYERS[mode].label}
                    </button>
                ))}
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom="center"
                dragging={true}
            >
                <TileLayer
                    attribution={tile.attribution}
                    url={tile.url}
                    maxZoom={19}
                />

                <MapController atendimentos={atendimentos} flyToId={flyToId} />

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
