-- =================================================================
-- Migration 001: Scraping Module
-- Execute no Supabase Dashboard > SQL Editor
-- =================================================================

-- -----------------------------------------------------------------
-- PASSO 1: Campos novos em tabelas existentes
-- -----------------------------------------------------------------

-- 1a. ALTER fontes (campos de scraping e processing)
ALTER TABLE fontes
  ADD COLUMN IF NOT EXISTS submission_type text NOT NULL DEFAULT 'spreadsheet',
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS scraping_status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pendente_raw',
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS last_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_scraped_at timestamptz,
  ADD COLUMN IF NOT EXISTS notas text;

-- 1b. ALTER fonte_registros (stage tracking + scraping tracking)
ALTER TABLE fonte_registros
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'raw',
  ADD COLUMN IF NOT EXISTS raw_registro_id uuid REFERENCES fonte_registros(id),
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS hash_conteudo text,
  ADD COLUMN IF NOT EXISTS scraping_run_id uuid,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS seen_count int DEFAULT 1;

-- 1c. Indice para busca de registros por stage
CREATE INDEX IF NOT EXISTS idx_fonte_registros_stage
  ON fonte_registros(fonte_id, stage);

-- 1d. Indice para dedup por source_id + fonte_id
CREATE INDEX IF NOT EXISTS idx_fonte_registros_source_id
  ON fonte_registros(fonte_id, source_id) WHERE source_id IS NOT NULL;

-- 1e. Indice para busca por hash
CREATE INDEX IF NOT EXISTS idx_fonte_registros_hash_conteudo
  ON fonte_registros(hash_conteudo) WHERE hash_conteudo IS NOT NULL;

-- -----------------------------------------------------------------
-- PASSO 2: Tabela scraping_queue (ScrapingRun)
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scraping_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_id uuid NOT NULL REFERENCES fontes(id) ON DELETE CASCADE,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  registros_scraped int DEFAULT 0,
  registros_novos int DEFAULT 0,
  registros_duplicados int DEFAULT 0,
  erro_mensagem text,
  notas_dev text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraping_queue_status
  ON scraping_queue(status) WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_scraping_queue_fonte
  ON scraping_queue(fonte_id);

-- -----------------------------------------------------------------
-- PASSO 3: Tabela scraping_page_cache
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scraping_page_cache (
  url_hash text PRIMARY KEY,
  url text NOT NULL,
  domain text NOT NULL,
  content bytea,
  content_type text DEFAULT 'text/html',
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_page_cache_domain
  ON scraping_page_cache(domain);
CREATE INDEX IF NOT EXISTS idx_page_cache_expires
  ON scraping_page_cache(expires_at);

-- -----------------------------------------------------------------
-- PASSO 4: Tabela scraping_request_log (observabilidade)
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scraping_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES scraping_queue(id) ON DELETE SET NULL,
  url text NOT NULL,
  domain text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  status_code int,
  response_time_ms int,
  cached boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_log_run
  ON scraping_request_log(run_id);
CREATE INDEX IF NOT EXISTS idx_request_log_created
  ON scraping_request_log(created_at DESC);

-- -----------------------------------------------------------------
-- PASSO 5: RLS policies
-- -----------------------------------------------------------------

ALTER TABLE scraping_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_page_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_request_log ENABLE ROW LEVEL SECURITY;

-- scraping_queue: leitura para autenticados, escrita para service_role
CREATE POLICY "authenticated_read_scraping_queue" ON scraping_queue
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "service_role_all_scraping_queue" ON scraping_queue
  FOR ALL USING (auth.role() = 'service_role');

-- scraping_page_cache: apenas service_role
CREATE POLICY "service_role_all_page_cache" ON scraping_page_cache
  FOR ALL USING (auth.role() = 'service_role');

-- scraping_request_log: leitura para autenticados, escrita para service_role
CREATE POLICY "authenticated_read_request_log" ON scraping_request_log
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "service_role_all_request_log" ON scraping_request_log
  FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------
-- PASSO 6: FK de scraping_run_id (apos criar scraping_queue)
-- -----------------------------------------------------------------

ALTER TABLE fonte_registros
  ADD CONSTRAINT fk_fonte_registros_scraping_run
  FOREIGN KEY (scraping_run_id) REFERENCES scraping_queue(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------
-- PASSO 7: Funcao de limpeza de cache expirado (executar via cron)
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_expired_page_cache()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM scraping_page_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
