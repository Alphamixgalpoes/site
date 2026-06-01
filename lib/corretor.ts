/** Dados do corretor — altere aqui para refletir em todo o site */
export const CORRETOR = {
  nome:     "Alphamix Galpões",
  creci:    "21563-J",
  telefone: "(11) 99557-1212",
  email:    "alphamix@alphamixgalpoes.com.br",
  whatsapp: "5511995571212",
  regiao:   "Alphaville · Barueri · SP",
} as const;

export function waLink(mensagem?: string): string {
  const base = `https://wa.me/${CORRETOR.whatsapp}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

export const WA_GENERICO = waLink(
  "Olá, vim pelo site da Alphamix Galpões e gostaria de informações."
);
