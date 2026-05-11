const documentos = [
  {
    categoria: "Contratos",
    items: [
      { titulo: "Contrato de Intermediação (Corretagem)", desc: "Conforme COFECI Resolução 1504/2023. Gerado com dados do corretor, partes e imóvel." },
      { titulo: "Compromisso de Compra e Venda", desc: "CCV com cláusulas de arras, condições e prazo para escritura." },
      { titulo: "Contrato de Locação Comercial", desc: "Lei 8.245/91. Inclui garantia, encargos e condições de uso." },
    ],
  },
  {
    categoria: "Propostas e Laudos",
    items: [
      { titulo: "Proposta Formal de Locação", desc: "Documento de proposta com valor, prazo, garantia e condições." },
      { titulo: "Laudo de Vistoria de Entrada", desc: "Registro do estado do imóvel com campos para fotos e observações." },
      { titulo: "Laudo de Vistoria de Saída", desc: "Comparativo com a vistoria de entrada ao término da locação." },
    ],
  },
  {
    categoria: "Checklists",
    items: [
      { titulo: "Checklist Documentação — Venda", desc: "Lista completa de certidões do imóvel, vendedor e comprador para operação de venda." },
      { titulo: "Checklist Documentação — Locação", desc: "Lista de documentos do imóvel, locador, locatário e garantias." },
      { titulo: "Checklist Regularização — Galpão", desc: "Habite-se, AVCB, Alvará, ART e regularidade no CRI." },
    ],
  },
];

export default function DocumentosPage() {
  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-400 mt-1">Emissão automática de contratos, propostas e checklists.</p>
        </div>
        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1.5 tracking-wide uppercase">
          Beta — Em desenvolvimento
        </span>
      </div>

      <div className="space-y-10">
        {documentos.map((cat) => (
          <div key={cat.categoria}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{cat.categoria}</p>
            <div className="grid md:grid-cols-3 gap-4">
              {cat.items.map((doc) => (
                <div key={doc.titulo} className="bg-white border border-gray-200 p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{doc.titulo}</p>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{doc.desc}</p>
                  </div>
                  <div className="mt-5">
                    <button
                      disabled
                      className="w-full border border-gray-200 text-gray-300 py-2 text-xs font-medium cursor-not-allowed"
                    >
                      Emitir documento — Em breve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 border border-gray-200 px-6 py-5 text-sm text-gray-500 leading-relaxed max-w-2xl">
        <p className="font-medium text-gray-700 mb-2">Sobre este módulo</p>
        <p>
          O painel de documentos permitirá gerar contratos e checklists preenchidos automaticamente com os dados
          já cadastrados no sistema — imóvel, partes e condições da negociação. Os documentos serão exportados
          em PDF no padrão Petrus Imóveis e estarão disponíveis para download e assinatura digital.
        </p>
      </div>
    </div>
  );
}
