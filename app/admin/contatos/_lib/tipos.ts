export const TIPOS = [
  { value: "proprietario", label: "Proprietário", plural: "Proprietários" },
  { value: "cliente", label: "Cliente", plural: "Clientes" },
  { value: "corretor_externo", label: "Corretor Externo", plural: "Corretores Externos" },
  { value: "advogado", label: "Advogado", plural: "Advogados" },
  { value: "engenheiro", label: "Engenheiro", plural: "Engenheiros" },
  { value: "cartorario", label: "Cartorário", plural: "Cartorários" },
  { value: "funcionario_prefeitura", label: "Funcionário Prefeitura", plural: "Funcionários Prefeitura" },
  { value: "administradora", label: "Administradora", plural: "Administradoras" },
  { value: "outro", label: "Outro", plural: "Outros" },
] as const;

export type TipoValue = (typeof TIPOS)[number]["value"];

export function tipoLabel(value: string) {
  return TIPOS.find((t) => t.value === value)?.label ?? value;
}

export function tipoPlural(value: string) {
  return TIPOS.find((t) => t.value === value)?.plural ?? value;
}
