type Card = {
  titulo: string;
  dado: string;
  href?: string;
};

const nivel1: Card[] = [
  { titulo: "Receita Federal / PGFN", dado: "CPF ou CNPJ", href: "https://servicos.receitafederal.gov.br/servicos/cpf/emitir-comprovante-de-situacao-cadastral-no-cpf" },
  { titulo: "Trabalhista — CNDT", dado: "CPF ou CNPJ", href: "https://cndt-certidao.tst.jus.br" },
  { titulo: "Justiça Federal", dado: "CPF ou CNPJ", href: "https://www.cjf.jus.br/cjf/certidao-negativa" },
  { titulo: "TJSP — Cível e Criminal", dado: "CPF ou CNPJ", href: "https://esaj.tjsp.jus.br/sco/abrirCadastroDevedores.do" },
  { titulo: "CRF FGTS", dado: "CNPJ", href: "https://consulta-crf.caixa.gov.br" },
  { titulo: "SEFAZ-SP", dado: "CPF ou CNPJ", href: "https://www.fazenda.sp.gov.br/certidao" },
  { titulo: "IPTU Barueri", dado: "Inscrição Municipal (SQL)", href: "https://portal.barueri.sp.gov.br/secretarias/secretaria-de-financas/certidao-debitos-imobilarios" },
  { titulo: "Municipal Barueri", dado: "CPF ou CNPJ", href: "https://portal.barueri.sp.gov.br/secretarias/secretaria-de-financas/certidao-debitos-imobilarios" },
  { titulo: "Certidão de Estado Civil", dado: "CPF", href: "https://www.registrocivil.org.br" },
  { titulo: "Situação Cadastral CPF", dado: "Sem dado adicional", href: "https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp" },
];

const nivel2: Card[] = [
  { titulo: "Certidão de Matrícula", dado: "Nº da matrícula (40 min) ou endereço (até 5 dias)", href: "https://arisp.com.br" },
  { titulo: "Certidão de Ônus Reais", dado: "Nº da matrícula", href: "https://arisp.com.br" },
  { titulo: "Certidão de Inteiro Teor", dado: "Nº da matrícula", href: "https://arisp.com.br" },
  { titulo: "Certidão de Protesto", dado: "CPF ou CNPJ — comarca do domicílio", href: "https://www.protestosp.com.br" },
  { titulo: "Junta Comercial — JUCESP", dado: "CNPJ", href: "https://www.jucesp.sp.gov.br" },
];

const nivel3: Card[] = [
  { titulo: "Certidão de Uso do Solo — Barueri", dado: "Endereço do imóvel — prazo: boleto em até 5 dias + análise" },
  { titulo: "Certidão Negativa de Condomínio", dado: "Depende da administradora — prazo: 1 a 5 dias" },
  { titulo: "AVCB", dado: "Empresa especializada + Corpo de Bombeiros — prazo: 30 a 90 dias" },
  { titulo: "Habite-se", dado: "Arquiteto/Engenheiro + Prefeitura Barueri — prazo: 3 a 12 meses" },
  { titulo: "Escritura de Compra e Venda", dado: "Presencial em Cartório de Notas — e-Notariado" },
];

function CardEmissao({ card, tipo }: { card: Card; tipo: "emitir" | "acessar" | "info" }) {
  return (
    <div className="bg-white border border-gray-200 p-4 flex flex-col justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">{card.titulo}</p>
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{card.dado}</p>
      </div>
      {tipo === "emitir" && card.href && (
        <a
          href={card.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center border border-gray-900 text-gray-900 py-2 text-xs font-medium hover:bg-gray-900 hover:text-white transition-colors"
        >
          Emitir
        </a>
      )}
      {tipo === "acessar" && card.href && (
        <a
          href={card.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center border border-gray-300 text-gray-500 py-2 text-xs font-medium hover:border-gray-500 hover:text-gray-900 transition-colors"
        >
          Acessar site
        </a>
      )}
      {tipo === "info" && (
        <p className="text-xs text-gray-300 py-2 text-center border border-gray-100">
          Presencial
        </p>
      )}
    </div>
  );
}

export default function EmissoesPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Emissões</h1>
        <p className="text-sm text-gray-400 mt-0.5">Acesso direto aos portais de emissão de certidões e documentos.</p>
      </div>

      {/* Nível 1 */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Emissão imediata — gratuita</p>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 font-medium">Online · resultado em minutos</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {nivel1.map((c) => <CardEmissao key={c.titulo} card={c} tipo="emitir" />)}
        </div>
      </div>

      {/* Nível 2 */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Online — pago · 1 a 2 dias úteis</p>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 font-medium">Custo conforme tabela</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {nivel2.map((c) => <CardEmissao key={c.titulo} card={c} tipo="acessar" />)}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Certidão de Matrícula: prefira busca por número de matrícula (40 min) em vez de endereço (até 5 dias).
          Certidão de Protesto: emitir na comarca do domicílio do vendedor, não na do imóvel.
        </p>
      </div>

      {/* Nível 3+ */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Requer presença ou terceiros</p>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 font-medium">Prazos variáveis</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {nivel3.map((c) => <CardEmissao key={c.titulo} card={c} tipo="info" />)}
        </div>
      </div>
    </div>
  );
}
