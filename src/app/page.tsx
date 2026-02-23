'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MountainSnow, Calendar, Users, ChevronRight, CheckCircle2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Evento } from '@/types/database';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { selectPublicEvent, publicSelectedEventId, clearPublicEvent } = useEvent();
  const router = useRouter();

  const [publicEvents, setPublicEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState<Evento | null>(null);

  useEffect(() => {
    async function fetchPublicEvents() {
      // Fetch all active events to display on the public page
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'ativo')
        .order('data_inicio', { ascending: true });

      setPublicEvents(data || []);
      setLoading(false);
    }
    fetchPublicEvents();
  }, []);

  function handleEventClick(evento: Evento) {
    // Save to public context
    selectPublicEvent(evento.id);
    setSelectedEventForModal(evento);
    setShowRoleModal(true);
  }

  function handleRoleSelection(role: 'participante' | 'organizacao') {
    if (role === 'organizacao') {
      router.push('/login');
    } else {
      // Future: redirect to participant registration/login flow
      alert("Fluxo do Participante em desenvolvimento (Fase 11)");
    }
  }

  // If already logged in AND has an active event selected via EventContext
  // Note: the EventContext will automatically select the publicSelectedEventId if the user has access.
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 16 }}>Carregando eventos...</p>
      </div>
    );
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <a className="navbar-brand" href="/">
            <span className="navbar-brand-icon"><MountainSnow size={24} /></span>
            <span className="navbar-brand-text">TrackMed</span>
          </a>
        </div>
      </nav>

      <div className="app-container">
        <div className="page-header" style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '40px 24px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(3,7,18,0) 100%)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-inner)',
          textAlign: 'center'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <MountainSnow size={48} style={{ color: '#10b981', margin: '0 auto 16px', opacity: 0.9 }} />
            <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: 8 }}>
              <span style={{
                background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>
                Acompanhamento Médico
              </span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto' }}>
              Selecione o evento para acessar sua ficha médica, seu indicativo de saúde ou a área da organização.
            </p>
          </div>
        </div>

        {publicEvents.length === 0 ? (
          <div className="card-static" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--color-text-muted)' }}>
            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: 8 }}>Nenhum evento ativo</h3>
            <p>Atualmente não há competições em andamento na plataforma.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {publicEvents.map((evento) => (
              <button
                key={evento.id}
                onClick={() => handleEventClick(evento)}
                className="card"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: publicSelectedEventId === evento.id ? '1px solid #10b981' : '1px solid var(--color-border)',
                  boxShadow: publicSelectedEventId === evento.id ? '0 0 0 1px #10b981, var(--shadow-md)' : 'var(--shadow-sm)',
                }}
              >
                <div style={{
                  height: 140,
                  width: '100%',
                  position: 'relative',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(15,23,42,1) 100%)'
                }}>
                  {evento.foto_url ? (
                    <img
                      src={evento.foto_url}
                      alt={evento.nome}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MountainSnow size={40} style={{ color: '#10b981', opacity: 0.5 }} />
                    </div>
                  )}
                  {publicSelectedEventId === evento.id && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', borderRadius: '50%', padding: 4 }}>
                      <CheckCircle2 size={20} color="#10b981" />
                    </div>
                  )}
                </div>

                <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text)' }}>
                    {evento.nome}
                  </h3>

                  {evento.descricao && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {evento.descricao}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                    {evento.data_inicio ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        <Calendar size={14} style={{ color: '#10b981' }} />
                        {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600 }}>
                      Acessar <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && selectedEventForModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowRoleModal(false)}
        >
          <div className="card-static" style={{ maxWidth: 440, width: '100%', padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-text)', marginBottom: 8 }}>
                Como você quer acessar?
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                Você selecionou o evento <strong style={{ color: 'var(--color-text)' }}>{selectedEventForModal.nome}</strong>.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <button
                onClick={() => handleRoleSelection('participante')}
                className="btn btn-secondary"
                style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16, height: 'auto', justifyContent: 'flex-start', border: '1px solid var(--color-border)' }}
              >
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: 10, borderRadius: '50%', color: '#10b981' }}>
                  <Users size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>Sou Participante</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Acessar ficha e exames</div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelection('organizacao')}
                className="btn btn-secondary"
                style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16, height: 'auto', justifyContent: 'flex-start', border: '1px solid var(--color-border)' }}
              >
                <div style={{ background: 'rgba(14,165,233,0.1)', padding: 10, borderRadius: '50%', color: '#0ea5e9' }}>
                  <Shield size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>Sou da Organização</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Acessar painel médico</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
