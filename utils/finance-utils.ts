import type { Entry, PagamentoSemanal } from "@/types/entry"

// Função para converter string de valor para número
export function parseValor(valorStr: string): number {
  return Number.parseFloat(valorStr.replace(/[^\d,]/g, "").replace(",", ".")) || 0
}

// Função para formatar número como valor monetário
export function formatValor(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`
}

// Função para aplicar desconto no valor total e recalcular parcelas
export function aplicarDesconto(entry: Entry, valorDesconto: string): Entry {
  // Converter valores para números
  const valorTotal = parseValor(entry.valor_cobrado_total)
  const desconto = parseValor(valorDesconto)

  // Guardar valor original
  const valorOriginal = entry.valor_cobrado_total

  // Calcular novo valor total
  const novoValorTotal = Math.max(0, valorTotal - desconto)

  // Calcular novo valor semanal (dividido por 4)
  const novoValorSemanal = novoValorTotal / 4

  // Atualizar pagamentos semanais se existirem
  let pagamentosAtualizados: PagamentoSemanal[] = []

  if (entry.pagamentos && entry.pagamentos.length > 0) {
    pagamentosAtualizados = entry.pagamentos.map((pagamento) => ({
      ...pagamento,
      valor: formatValor(novoValorSemanal),
    }))
  } else {
    // Criar pagamentos semanais se não existirem
    pagamentosAtualizados = Array.from({ length: 4 }, (_, i) => ({
      semana: i + 1,
      status: "nao_pago",
      valor: formatValor(novoValorSemanal),
      data: "",
    }))
  }

  // Retornar entry atualizado
  return {
    ...entry,
    valor_cobrado_total: formatValor(novoValorTotal),
    valor_cobrado_semanal: formatValor(novoValorSemanal),
    valorDesconto,
    descontoAplicado: true,
    valorOriginal,
    pagamentos: pagamentosAtualizados,
  }
}

// Função para contar indicações e determinar o valor do desconto
export function calcularValorDesconto(indicacoes: number): string {
  // R$500 para primeira indicação, R$250 para as demais
  const valorDesconto = indicacoes === 0 ? 500 : 250
  return formatValor(valorDesconto)
}
