'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MountainSnow, Calendar, MapPin, Users, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { eventos, selectedEvento, loading: eventLoading, selectEvento } = useEvent();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // If event is already selected (auto-selected or previously), go to dashboard
  useEffect(() => {
    if (selectedEvento && !authLoading) {
      router.push('/dashboard');
    }
  }, [selectedEvento, authLoading, router]);

  if (authLoading || eventLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-secondary)' }}>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <a className="navbar-brand" href="/">
            <span className="navbar-brand-icon"><MountainSnow size={24} /></span>
            <span className="navbar-brand-text">Trekking Medical</span>
          </a>
        </div>
      </nav>

      <div className="app-container">
        <div className="page-header" style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '32px 24px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(3,7,18,0) 100%)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-inner)'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '2rem' }}>
              <span style={{
                background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>
                Selecione o Evento
              </span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
              Escolha o evento que deseja monitorar
            </p>
          </div>
        </div>

        {eventos.length === 0 ? (
          <div className="card-static" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
            <MountainSnow size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>Nenhum evento disponível</p>
            <p style={{ fontSize: '0.85rem', marginTop: 8 }}>Você não está vinculado a nenhum evento ativo.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {eventos.map((evento) => (
              <button
                key={evento.id}
                onClick={() => selectEvento(evento)}
                className="card-static"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '20px 24px',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--color-border)',
                }}
              >
                {evento.foto_url ? (
                  <img
                    src={evento.foto_url}
                    alt={evento.nome}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-lg)',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    <MountainSnow size={28} style={{ color: 'var(--color-accent)' }} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    marginBottom: 4,
                    color: 'var(--color-text)',
                  }}>
                    {evento.nome}
                  </h3>
                  {evento.descricao && (
                    <p style={{
                      color: 'var(--color-text-muted)',
                      fontSize: '0.85rem',
                      lineHeight: 1.4,
                      marginBottom: 8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {evento.descricao}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {evento.data_inicio && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.8rem', color: 'var(--color-text-secondary)'
                      }}>
                        <Calendar size={13} />
                        {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    <span className={`badge badge-${evento.status === 'ativo' ? 'leve' : 'moderado'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                      {evento.status}
                    </span>
                  </div>
                </div>

                <ChevronRight size={20} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
