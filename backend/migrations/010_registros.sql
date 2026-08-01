-- Migration 010: Registro Rapido
-- Modulo de captura rapida via iPhone Shortcuts (fotos + transcricao de audio)

-- 1. Tabela principal de registros
CREATE TABLE IF NOT EXISTS registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text,
  status text NOT NULL DEFAULT 'novo',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Arquivos vinculados ao registro (fotos, audio)
CREATE TABLE IF NOT EXISTS registro_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'foto',
  storage_path text NOT NULL,
  nome text,
  content_type text,
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_registro_arquivos_registro ON registro_arquivos(registro_id);

-- 3. RLS
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_registros" ON registros
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_registros" ON registros
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_registro_arquivos" ON registro_arquivos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_registro_arquivos" ON registro_arquivos
  FOR SELECT TO authenticated USING (true);

-- 4. Bucket Storage: criar via dashboard -> Storage -> New Bucket
--    Nome: registros
--    Tipo: Private
