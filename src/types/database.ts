export interface Participante {
    id: string;
    nome: string;
    nfc_tag_id: string;
    cpf?: string;
    idade?: number;
    telefone?: string;
    telefone_emergencia?: string;
    contato_emergencia_nome?: string;
    alergias?: string;
    condicoes_medicas?: string;
    medicamentos?: string;
    tipo_sanguineo?: string;
    foto_url?: string;
    created_at: string;
    updated_at: string;
}

export interface Medico {
    id: string;
    nome: string;
    crm?: string;
    especialidade?: string;
    telefone?: string;
    is_admin: boolean;
    created_at: string;
}

export type Gravidade = 'leve' | 'moderado' | 'grave' | 'critico';
export type StatusAtendimento = 'em_andamento' | 'finalizado' | 'encaminhado';

export interface Atendimento {
    id: string;
    participante_id: string;
    medico_id: string;
    descricao: string;
    gravidade: Gravidade;
    latitude: number;
    longitude: number;
    altitude?: number;
    precisao_gps?: number;
    status: StatusAtendimento;
    observacoes?: string;
    created_at: string;
    updated_at: string;
    // Joined
    participante?: Participante;
    medico?: Medico;
    fotos?: AtendimentoFoto[];
}

export interface AtendimentoFoto {
    id: string;
    atendimento_id: string;
    foto_url: string;
    legenda?: string;
    created_at: string;
}

export const GRAVIDADE_CONFIG: Record<Gravidade, { label: string; color: string; bgColor: string; icon: string }> = {
    leve: { label: 'Leve', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', icon: '🟢' },
    moderado: { label: 'Moderado', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: '🟡' },
    grave: { label: 'Grave', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', icon: '🟠' },
    critico: { label: 'Crítico', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: '🔴' },
};
