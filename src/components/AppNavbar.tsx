'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import { MountainSnow, ArrowLeftRight } from 'lucide-react';

interface AppNavbarProps {
    activePage: 'dashboard' | 'participantes' | 'equipe';
}

export default function AppNavbar({ activePage }: AppNavbarProps) {
    const { isSuperAdmin, signOut } = useAuth();
    const { selectedEvento, clearEvento } = useEvent();
    const router = useRouter();

    function handleTrocarEvento() {
        clearEvento();
        router.push('/');
    }

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <a className="navbar-brand" href="/dashboard">
                    <span className="navbar-brand-icon"><MountainSnow size={24} /></span>
                    <span className="navbar-brand-text">Trekking Medical</span>
                    {selectedEvento && (
                        <span style={{
                            marginLeft: 8, fontSize: '0.7rem', padding: '2px 8px',
                            borderRadius: 12, background: 'rgba(16,185,129,0.12)',
                            color: '#10b981', border: '1px solid rgba(16,185,129,0.25)',
                            fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                            {selectedEvento.nome}
                        </span>
                    )}
                </a>
                <div className="navbar-links">
                    <a href="/dashboard" className={`navbar-link${activePage === 'dashboard' ? ' active' : ''}`}>Dashboard</a>
                    <a href="/admin/participantes" className={`navbar-link${activePage === 'participantes' ? ' active' : ''}`}>Participantes</a>
                    <a href="/admin/medicos" className={`navbar-link${activePage === 'equipe' ? ' active' : ''}`}>Equipe</a>
                    {isSuperAdmin && (
                        <a href="/super-admin" className="navbar-link" style={{ color: '#a78bfa' }}>⚡ Admin</a>
                    )}
                    <button
                        onClick={handleTrocarEvento}
                        className="btn btn-sm btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                        title="Trocar Evento"
                    >
                        <ArrowLeftRight size={14} /> Trocar
                    </button>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={signOut}
                    >
                        Sair
                    </button>
                </div>
            </div>
        </nav>
    );
}
