"use client";

import CentralPage from "../_components/CentralPage";

export default function DocumentosCentral() {
  return (
    <CentralPage
      title="Documentos"
      subtitle="Emissao, modelos e controle de validade"
      lenses={[
        { label: "Emissoes", href: "/admin/documentos/emissoes", description: "Links para emissao de certidoes e documentos em portais oficiais" },
        { label: "Modelos", href: "/admin/documentos/modelos", description: "Templates de contratos, propostas e checklists" },
        { label: "Vencimentos", href: "/admin/documentos/vencimentos", description: "Controle de validade de certidoes e AVCB por imovel" },
      ]}
    />
  );
}
