import { Tag, ShieldAlert, AlertTriangle, Droplet, Phone } from 'lucide-react';
import type { Participante } from '@/types/database';

export default function ParticipantProfile({ participante }: { participante: Participante }) {
    if (!participante) return null;

    return (
        <div className="participant-card" style={{ padding: 0, overflow: 'hidden' }}>

            {/* 1. HERO SECTION (Basic Info) */}
            <div style={{ padding: '20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <div className="participant-avatar" style={{ width: 64, height: 64, fontSize: '1.8rem', flexShrink: 0 }}>
                        {participante.nome?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2, color: 'var(--color-text)' }}>
                            {participante.nome}
                        </h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={14} /> {participante.nfc_tag_id}</span>
                            {participante.idade && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>• {participante.idade} anos</span>}
                            {participante.cidade_estado && <span style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>• {participante.cidade_estado}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. WARNING BADGES (Alergias / Hakuna) - HIGHEST PRIORITY */}
            {(participante.alergias || participante.observacao_hakuna) && (
                <div style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {participante.alergias && (
                        <div style={{ display: 'flex', gap: 8, color: 'var(--color-critico)', fontSize: '0.9rem', marginBottom: participante.observacao_hakuna ? 8 : 0 }}>
                            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                            <div><strong style={{ display: 'block', marginBottom: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>ALERGIA GRAVE / RESTRIÇÃO</strong> {participante.alergias}</div>
                        </div>
                    )}
                    {participante.observacao_hakuna && (
                        <div style={{ display: 'flex', gap: 8, color: 'var(--color-grave)', fontSize: '0.9rem' }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                            <div><strong style={{ display: 'block', marginBottom: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>LAUDO HAKUNA</strong> {participante.observacao_hakuna}</div>
                        </div>
                    )}
                </div>
            )}

            {/* 3. VITALS STRIP (Contrasting Darker Background) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#0f172a', padding: '16px 20px', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sangue</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: participante.tipo_sanguineo ? '#ef4444' : '#64748b' }}>
                        <Droplet size={14} style={{ display: 'inline', marginBottom: -1 }} /> {participante.tipo_sanguineo || '--'}
                    </div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Peso</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                        {participante.peso ? `${participante.peso}kg` : '--'}
                    </div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Altura</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                        {participante.altura ? `${participante.altura}m` : '--'}
                    </div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>IMC</div>
                    {(() => {
                        if (!participante.peso || !participante.altura) return <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>--</div>;
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

            {/* 4. IMC & BIOTIPO SECTION */}
            <div style={{ padding: '0 20px 20px 20px', background: '#0f172a', borderBottom: '1px solid var(--color-border)' }}>
                {(() => {
                    if (!participante.peso || !participante.altura) return null;
                    const imc = participante.peso / (participante.altura * participante.altura);
                    const imcSegments = [
                        { label: 'Ab', color: '#3b82f6', max: 18.49 },
                        { label: 'Nm', color: '#22c55e', max: 24.99 },
                        { label: 'Sp', color: '#eab308', max: 29.99 },
                        { label: 'Ob1', color: '#f97316', max: 34.99 },
                        { label: 'Ob2', color: '#ef4444', max: 39.99 },
                        { label: 'Ob3', color: '#a855f7', max: Infinity },
                    ];
                    const activeIndex = imcSegments.findIndex(s => imc <= s.max);

                    return (
                        <div style={{ marginTop: 4 }}>
                            {/* Pointer */}
                            <div style={{ display: 'flex', width: '100%', position: 'relative', height: 10, marginBottom: 2 }}>
                                {imcSegments.map((seg, i) => (
                                    <div key={i} style={{ flex: 1, position: 'relative' }}>
                                        {i === activeIndex && (
                                            <div style={{
                                                position: 'absolute', left: '50%', bottom: 0,
                                                transform: 'translateX(-50%)',
                                                width: 0, height: 0,
                                                borderLeft: '5px solid transparent',
                                                borderRight: '5px solid transparent',
                                                borderTop: '6px solid #f8fafc'
                                            }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Bar */}
                            <div style={{ display: 'flex', width: '100%', height: 26, borderRadius: 4, overflow: 'hidden' }}>
                                {imcSegments.map((seg, i) => (
                                    <div key={i} style={{ flex: 1, backgroundColor: seg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
                                        {seg.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Meta Info (Biotipo, Plano, Equipe) */}
            {(participante.biotipo || participante.atividade_fisica_semanal || participante.plano_saude || participante.equipe_familia) && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {participante.biotipo && (
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 2 }}>Biotipo</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>{participante.biotipo}</div>
                        </div>
                    )}
                    {participante.atividade_fisica_semanal && (
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 2 }}>Ativ. Física</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>{participante.atividade_fisica_semanal}</div>
                        </div>
                    )}
                    {participante.plano_saude && (
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 2 }}>Plano de Saúde</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>{participante.plano_saude}</div>
                        </div>
                    )}
                    {participante.equipe_familia && (
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 2 }}>Equipe/Família</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>{participante.equipe_familia}</div>
                        </div>
                    )}
                </div>
            )}

            {/* 5. HEALTH INDICATOR SCALE (1 to 5) */}
            {participante.indicativo_saude && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Indicativo de Saúde</div>
                    {(() => {
                        const level = participante.indicativo_saude || 0;
                        const segments = [
                            { label: '1', color: '#ef4444', val: 1 },
                            { label: '2', color: '#f97316', val: 2 },
                            { label: '3', color: '#eab308', val: 3 },
                            { label: '4', color: '#22c55e', val: 4 },
                            { label: '5', color: '#3b82f6', val: 5 },
                        ];
                        const activeIndex = segments.findIndex(s => s.val === level);
                        return (
                            <div>
                                {/* Pointer */}
                                <div style={{ display: 'flex', width: '100%', position: 'relative', height: 10, marginBottom: 2 }}>
                                    {segments.map((seg, i) => (
                                        <div key={i} style={{ flex: 1, position: 'relative' }}>
                                            {i === activeIndex && (
                                                <div style={{
                                                    position: 'absolute', left: '50%', bottom: 0,
                                                    transform: 'translateX(-50%)',
                                                    width: 0, height: 0,
                                                    borderLeft: '5px solid transparent',
                                                    borderRight: '5px solid transparent',
                                                    borderTop: '6px solid var(--color-text)'
                                                }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Bar */}
                                <div style={{ display: 'flex', width: '100%', height: 28, borderRadius: 4, overflow: 'hidden' }}>
                                    {segments.map((seg, i) => (
                                        <div key={i} style={{ flex: 1, backgroundColor: seg.color, opacity: i === activeIndex ? 1 : 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}>
                                            {seg.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* 6. CORE CLINICAL OBSERVATIONS */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(participante.condicoes_medicas || participante.medicamentos || participante.outras_informacoes_medicas) && (
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text)', marginBottom: 4 }}>
                            Observações de Saúde
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {participante.condicoes_medicas && (
                                <div style={{ marginBottom: participante.medicamentos || participante.outras_informacoes_medicas ? 6 : 0, fontStyle: 'italic' }}>
                                    {participante.condicoes_medicas}
                                </div>
                            )}
                            {participante.medicamentos && (
                                <div style={{ marginBottom: participante.outras_informacoes_medicas ? 6 : 0, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                    {participante.medicamentos}
                                </div>
                            )}
                            {participante.outras_informacoes_medicas && (
                                <div>
                                    {participante.outras_informacoes_medicas}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {participante.cirurgias && (
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text)', marginBottom: 4 }}>
                            Cirurgias
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, textTransform: 'uppercase' }}>
                            {participante.cirurgias}
                        </div>
                    </div>
                )}

                {participante.observacao_hakuna && (
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text)', marginBottom: 4 }}>
                            Observação Hakuna
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                            {participante.observacao_hakuna}
                        </div>
                    </div>
                )}

                {/* Emergency Contacts */}
                {(participante.telefone_emergencia || participante.contato_emergencia_nome) && (
                    <div style={{ marginTop: 4, paddingTop: 16, borderTop: '1px dashed var(--color-border)', display: 'flex', gap: 12, alignItems: 'center', color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Phone size={16} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Emergência</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                                {participante.contato_emergencia_nome} {participante.contato_emergencia_nome && participante.telefone_emergencia && '•'} <a href={`tel:${participante.telefone_emergencia}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{participante.telefone_emergencia}</a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
