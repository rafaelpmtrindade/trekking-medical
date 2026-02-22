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

interface MapProps {
    atendimentos: Atendimento[];
    center?: [number, number];
    zoom?: number;
}

function getMarkerIcon(gravidade: string) {
    if (typeof window === 'undefined') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    const config = GRAVIDADE_CONFIG[gravidade as keyof typeof GRAVIDADE_CONFIG];

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${config?.color || '#94a3b8'};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
    });
}

export default function Map({ atendimentos, center, zoom = 13 }: MapProps) {
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
                {atendimentos.map((at) => (
                    <Marker
                        key={at.id}
                        position={[at.latitude, at.longitude]}
                        icon={getMarkerIcon(at.gravidade)}
                    >
                        <Popup>
                            <div style={{ minWidth: 200, fontFamily: 'Inter, sans-serif' }}>
                                <strong style={{ fontSize: '1rem' }}>
                                    {at.participante?.nome || 'Participante'}
                                </strong>
                                <div style={{ margin: '8px 0' }}>
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
                ))}
            </MapContainer>
        </div>
    );
}
