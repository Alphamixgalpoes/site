export type ItemPadrao = {
  categoria: "documento" | "certidao" | "acao" | "recomendacao";
  titulo: string;
  descricao?: string;
  ordem: number;
};

const itensVenda: ItemPadrao[] = [
  // DOCUMENTOS
  { categoria: "documento", titulo: "RG e CPF — Vendedor", ordem: 1 },
  { categoria: "documento", titulo: "Certidão de estado civil — Vendedor", ordem: 2 },
  { categoria: "documento", titulo: "RG e CPF — Comprador", ordem: 3 },

  // CERTIDÕES
  { categoria: "certidao", titulo: "RF/PGFN — Vendedor", descricao: "Receita Federal — inclui INSS desde 2014", ordem: 10 },
  { categoria: "certidao", titulo: "Trabalhista (CNDT) — Vendedor", ordem: 11 },
  { categoria: "certidao", titulo: "Justiça Federal — Vendedor", ordem: 12 },
  { categoria: "certidao", titulo: "TJSP — Vendedor", ordem: 13 },
  { categoria: "certidao", titulo: "SEFAZ-SP — Vendedor", ordem: 14 },
  { categoria: "certidao", titulo: "Municipal Barueri — Vendedor", ordem: 15 },
  { categoria: "certidao", titulo: "Certidão de Protesto — Vendedor", descricao: "Emitir na comarca do domicílio do vendedor, não na do imóvel", ordem: 16 },
  { categoria: "certidao", titulo: "Certidão de Matrícula — Imóvel", descricao: "Solicitar por número de matrícula: 40 min. Por endereço: até 5 dias", ordem: 17 },
  { categoria: "certidao", titulo: "Certidão de Ônus Reais — Imóvel", ordem: 18 },
  { categoria: "certidao", titulo: "IPTU — Certidão Negativa", ordem: 19 },
  { categoria: "certidao", titulo: "Certidão de Uso do Solo — Imóvel", descricao: "Barueri: boleto em até 5 dias + prazo de análise", ordem: 20 },
  { categoria: "certidao", titulo: "AVCB — Imóvel", descricao: "Verificar validade antes de avançar na negociação", ordem: 21 },
  { categoria: "certidao", titulo: "Habite-se — Imóvel", ordem: 22 },
  { categoria: "certidao", titulo: "RF/PGFN — Comprador", ordem: 23 },
  { categoria: "certidao", titulo: "TJSP — Comprador", ordem: 24 },

  // AÇÕES
  { categoria: "acao", titulo: "Calcular ITBI", descricao: "Confirmar alíquota com Prefeitura de Barueri antes de informar ao cliente", ordem: 30 },
  { categoria: "acao", titulo: "Verificar AVCB e Habite-se", descricao: "Confirmar validade antes de assinar qualquer documento", ordem: 31 },
  { categoria: "acao", titulo: "Agendar escritura em Cartório de Notas", descricao: "Todas as partes presentes com documentos originais", ordem: 32 },
  { categoria: "acao", titulo: "Confirmar pagamento do ITBI", descricao: "Obrigatório antes de protocolar no CRI", ordem: 33 },
  { categoria: "acao", titulo: "Protocolar no CRI", descricao: "Após escritura lavrada e ITBI pago — prazo: 15 a 30 dias úteis", ordem: 34 },

  // RECOMENDAÇÕES
  { categoria: "recomendacao", titulo: "Usar número de matrícula na busca", descricao: "Busca por número: 40 min. Por endereço ou nome: até 5 dias", ordem: 40 },
  { categoria: "recomendacao", titulo: "Protesto na comarca correta", descricao: "Comarca do domicílio do vendedor — não a do imóvel", ordem: 41 },
  { categoria: "recomendacao", titulo: "INSS já incluso na RF/PGFN", descricao: "Não existe certidão de INSS separada desde 2014", ordem: 42 },
];

const itensLocacao: ItemPadrao[] = [
  // DOCUMENTOS
  { categoria: "documento", titulo: "RG e CPF / Contrato Social — Locador", ordem: 1 },
  { categoria: "documento", titulo: "RG e CPF / Contrato Social — Locatário", ordem: 2 },

  // CERTIDÕES
  { categoria: "certidao", titulo: "RF/PGFN — Locador", ordem: 10 },
  { categoria: "certidao", titulo: "CRF FGTS — Locador", descricao: "Aplicável se pessoa jurídica", ordem: 11 },
  { categoria: "certidao", titulo: "CNDT — Locador", ordem: 12 },
  { categoria: "certidao", titulo: "SEFAZ-SP — Locador", ordem: 13 },
  { categoria: "certidao", titulo: "RF/PGFN — Locatário", ordem: 14 },
  { categoria: "certidao", titulo: "CRF FGTS — Locatário", descricao: "Aplicável se pessoa jurídica", ordem: 15 },
  { categoria: "certidao", titulo: "Certidão de Matrícula — Imóvel", ordem: 16 },
  { categoria: "certidao", titulo: "IPTU — Certidão Negativa", ordem: 17 },
  { categoria: "certidao", titulo: "AVCB — Imóvel", descricao: "Deve estar válido na assinatura do contrato", ordem: 18 },

  // AÇÕES
  { categoria: "acao", titulo: "Verificar AVCB válido", descricao: "Confirmar validade antes de assinar", ordem: 30 },
  { categoria: "acao", titulo: "Definir modalidade de garantia", descricao: "Fiador, seguro fiança, caução ou título de capitalização", ordem: 31 },
  { categoria: "acao", titulo: "Realizar vistoria de entrada", descricao: "Laudo com fotos — registro do estado do imóvel", ordem: 32 },
  { categoria: "acao", titulo: "Definir índice de reajuste", descricao: "IGPM ou IPCA — registrar no contrato", ordem: 33 },

  // RECOMENDAÇÕES
  { categoria: "recomendacao", titulo: "Verificar uso do solo", descricao: "Confirmar que a atividade do locatário é compatível com o zoneamento de Barueri", ordem: 40 },
  { categoria: "recomendacao", titulo: "AVCB obrigatório na assinatura", descricao: "Não assinar contrato com AVCB vencido ou ausente", ordem: 41 },
  { categoria: "recomendacao", titulo: "Considerar registro do contrato em cartório", descricao: "Não obrigatório, mas garante vigência contra terceiros (erga omnes)", ordem: 42 },
];

const itensRegularizacao: ItemPadrao[] = [
  // CERTIDÕES
  { categoria: "certidao", titulo: "Certidão de Matrícula atualizada", ordem: 10 },
  { categoria: "certidao", titulo: "Certidão de Uso do Solo — Barueri", descricao: "Necessária para confirmar zoneamento e viabilidade", ordem: 11 },

  // AÇÕES
  { categoria: "acao", titulo: "Avaliar necessidade de AVCB", descricao: "Via Fácil Bombeiros — corpodebombeiros.sp.gov.br", ordem: 20 },
  { categoria: "acao", titulo: "Contratar empresa especializada para AVCB", descricao: "Mais eficiente do que protocolar diretamente junto ao Corpo de Bombeiros", ordem: 21 },
  { categoria: "acao", titulo: "Avaliar necessidade de Habite-se", descricao: "Tratar com Prefeitura de Barueri — SPCU", ordem: 22 },
  { categoria: "acao", titulo: "Contratar engenheiro ou arquiteto — ART", descricao: "Obrigatório para regularização junto à prefeitura", ordem: 23 },
  { categoria: "acao", titulo: "Verificar averbação de construção no CRI", descricao: "Área construída na matrícula deve coincidir com a realidade", ordem: 24 },
  { categoria: "acao", titulo: "Verificar INSS da obra se houver averbação", descricao: "Exigido pelo CRI para averbação de construção", ordem: 25 },

  // RECOMENDAÇÕES
  { categoria: "recomendacao", titulo: "Prazo real do AVCB", descricao: "Sem problemas: 30 a 90 dias. Com não conformidades (obras necessárias): até 6 meses", ordem: 30 },
  { categoria: "recomendacao", titulo: "Habite-se retroativo em Barueri", descricao: "Aceite pela prefeitura é incerto — confirmar viabilidade antes de comprometer prazo com o cliente", ordem: 31 },
  { categoria: "recomendacao", titulo: "Averbação divergente — prazo", descricao: "Exige: INSS obra + memorial descritivo + ART + CRI. Prazo médio: 2 a 6 meses", ordem: 32 },
];

export function getItensPadrao(tipo: string): ItemPadrao[] {
  if (tipo === "venda") return itensVenda;
  if (tipo === "locacao") return itensLocacao;
  if (tipo === "regularizacao") return itensRegularizacao;
  return [];
}
