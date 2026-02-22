-- Run this in the Supabase SQL Editor

ALTER TABLE participantes
ADD COLUMN IF NOT EXISTS peso DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS altura DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS cidade_estado TEXT,
ADD COLUMN IF NOT EXISTS equipe_familia TEXT,
ADD COLUMN IF NOT EXISTS biotipo TEXT,
ADD COLUMN IF NOT EXISTS indicativo_saude INTEGER CHECK (indicativo_saude >= 1 AND indicativo_saude <= 5),
ADD COLUMN IF NOT EXISTS cirurgias TEXT,
ADD COLUMN IF NOT EXISTS observacao_hakuna TEXT,
ADD COLUMN IF NOT EXISTS atividade_fisica_semanal TEXT,
ADD COLUMN IF NOT EXISTS plano_saude TEXT,
ADD COLUMN IF NOT EXISTS outras_informacoes_medicas TEXT;

-- Update the TypeScript interface matching this schema in src/types/database.ts
