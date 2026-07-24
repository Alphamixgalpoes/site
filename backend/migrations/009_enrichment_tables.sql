-- Migration 009: Enrichment Cards + Events
-- Projetado para recálculo frequente: DELETE cascade + batch INSERT
-- Índices otimizados para listagem paginada e lookup por fonte

-- ============================================================
-- Tabela: enrichment_cards
-- Um card = 1 registro novo + top N imóveis similares (ranking)
-- ============================================================
CREATE TABLE enrichment_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_id UUID NOT NULL REFERENCES fontes(id) ON DELETE CASCADE,
  fonte_registro_id UUID NOT NULL REFERENCES fonte_registros(id) ON DELETE CASCADE,

  -- Snapshot imutável dos dados do registro (estado na geração)
  registro_snapshot JSONB NOT NULL,

  -- Top N similares: [{imovel_id, score, rank, snapshot}]
  similares JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Campos desnormalizados para filtro/ordenação rápida
  cidade TEXT,
  bairro TEXT,
  logradouro TEXT,
  area FLOAT,
  score_max FLOAT,

  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'descartado')),

  finalizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice principal: listagem filtrada por status (99% das queries)
CREATE INDEX idx_enrichment_cards_status_created
  ON enrichment_cards(status, created_at DESC);

-- Recálculo: deletar todos de uma fonte rapidamente
CREATE INDEX idx_enrichment_cards_fonte
  ON enrichment_cards(fonte_id);

-- Filtros secundários
CREATE INDEX idx_enrichment_cards_cidade
  ON enrichment_cards(cidade) WHERE status = 'pendente';

-- ============================================================
-- Tabela: enrichment_events
-- Event sourcing: cada drag/edit é um evento imutável
-- Eventos NÃO são aplicados até finalização do card
-- ============================================================
CREATE TABLE enrichment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES enrichment_cards(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL CHECK (tipo IN ('transferir', 'editar')),

  campo TEXT NOT NULL,
  valor_anterior JSONB,
  valor_novo JSONB NOT NULL,

  -- Origem do dado
  origem_tipo TEXT NOT NULL CHECK (origem_tipo IN ('registro', 'imovel', 'manual')),
  origem_id TEXT,

  -- Destino do dado
  destino_tipo TEXT NOT NULL CHECK (destino_tipo IN ('registro', 'imovel')),
  destino_id TEXT NOT NULL,

  -- Soft undo (evento permanece para auditoria)
  undone BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Carregar todos os eventos de um card (ordenados para replay)
CREATE INDEX idx_enrichment_events_card_created
  ON enrichment_events(card_id, created_at);

-- Auditoria: quais eventos tocaram um imóvel específico
CREATE INDEX idx_enrichment_events_destino
  ON enrichment_events(destino_tipo, destino_id);

-- ============================================================
-- RLS: ambas as tabelas requerem autenticação
-- ============================================================
ALTER TABLE enrichment_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_events ENABLE ROW LEVEL SECURITY;

-- Policy: service_role tem acesso total (backend usa service key)
CREATE POLICY "service_role_enrichment_cards"
  ON enrichment_cards FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_enrichment_events"
  ON enrichment_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Policy: authenticated users podem ler
CREATE POLICY "authenticated_read_enrichment_cards"
  ON enrichment_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_enrichment_events"
  ON enrichment_events FOR SELECT
  TO authenticated
  USING (true);

-- Policy: authenticated users podem inserir/atualizar events
CREATE POLICY "authenticated_write_enrichment_events"
  ON enrichment_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: authenticated users podem atualizar cards (status)
CREATE POLICY "authenticated_update_enrichment_cards"
  ON enrichment_cards FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_enrichment_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enrichment_cards_updated_at
  BEFORE UPDATE ON enrichment_cards
  FOR EACH ROW EXECUTE FUNCTION update_enrichment_cards_updated_at();
