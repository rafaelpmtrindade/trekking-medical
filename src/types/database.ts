// ============================================================
// RBAC Types
// ============================================================

export type EventoStatus = 'draft' | 'ativo' | 'encerrado' | 'arquivado';
export type EventoRole = 'admin_evento' | 'equipe_saude';

export interface Evento {
    id: string;
    nome: string;
    descricao?: string;
    foto_url?: string;
    data_inicio?: string;
    data_fim?: string;
    status: EventoStatus;
    created_by?: string;
    created_at: string;
}

export interface Usuario {
    id: string;
    nome: string;
    email?: string;
    is_super_admin: boolean;
    is_active: boolean;
    created_at: string;
}

export interface EventoUsuario {
    id: string;
    evento_id: string;
    usuario_id: string;
    role: EventoRole;
    is_active: boolean;
    criado_por?: string;
    created_at: string;
    // Joined
    evento?: Evento;
    permissoes_list?: Permissao[];
}

export interface Permissao {
    id: string;
    codigo: string;
    descricao?: string;
    aplica_a_role: string;
}

// ============================================================
// Domain Types (existing, enhanced)
// ============================================================

export interface Participante {
    id: string;
    nome: string;
    nfc_tag_id: string;
    evento_id?: string;
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

    // Clinical data
    peso?: number;
    altura?: number;
    cidade_estado?: string;
    equipe_familia?: string;
    biotipo?: string;
    indicativo_saude?: number;
    cirurgias?: string;
    observacao_hakuna?: string;
    atividade_fisica_semanal?: string;
    plano_saude?: string;
    outras_informacoes_medicas?: string;

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
    evento_id?: string;
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
