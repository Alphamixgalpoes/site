export type GalpaoImagem = {
  id: string;
  storage_path: string;
  ordem: number;
  visivel_site: boolean;
  is_capa: boolean;
};

export type Galpao = {
  id: string;
  titulo: string;
  tipo: string;
  categoria: string;
  uso_terreno: string | null;
  valor: number | null;
  cidade: string;
  bairro: string | null;
  endereco: string | null;
  cep: string | null;
  publicado: boolean;
  area_construida_m2: number | null;
  area_total_m2: number | null;
  area_piso_m2: number | null;
  pe_direito_m: number | null;
  numero_docas: number;
  acesso_carreta: boolean;
  sprinklers: boolean;
  guarita: boolean;
  potencia_eletrica_kva: number | null;
  vagas_estacionamento: number;
  condominio: boolean;
  valor_condominio: number | null;
  descricao: string | null;
  observacoes: string | null;
  campos_visibilidade: Record<string, { card: boolean; ficha: boolean }>;
  latitude: number | null;
  longitude: number | null;
  galpao_imagens: GalpaoImagem[];
};

// Tipo para a grid pública — subconjunto dos campos exibidos ao visitante
export type GalpaoPublico = {
  id: string;
  titulo: string;
  tipo: string;
  categoria: string;
  uso_terreno: string | null;
  valor: number | null;
  cidade: string;
  bairro: string | null;
  area_construida_m2: number | null;
  area_total_m2: number | null;
  pe_direito_m: number | null;
  numero_docas: number;
  acesso_carreta: boolean;
  vagas_estacionamento: number;
  descricao: string | null;
  campos_visibilidade?: Record<string, { card: boolean; ficha: boolean }>;
  galpao_imagens: { storage_path: string; ordem: number; is_capa?: boolean }[];
};
