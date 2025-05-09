import type { Entry, PagamentoSemanal } from "@/types/entry"
import { parseValor, formatValor } from "@/utils/finance-utils"

// Função para determinar a semana do mês (1-4) com base na data
export function getWeekOfMonth(date: Date): number {
  const day = date.getDate()

  // Semana 1: dias 1-7
  // Semana 2: dias 8-14
  // Semana 3: dias 15-21
  // Semana 4: dias 22-31
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

// Função para obter a próxima sexta-feira a partir de uma data
export function getNextFriday(date: Date): Date {
  const result = new Date(date)
  const dayOfWeek = date.getDay() // 0 = Domingo, 6 = Sábado

  // Se for sexta-feira (5), avança para a próxima sexta
  if (dayOfWeek === 5) {
    result.setDate(date.getDate() + 7)
  } else {
    // Calcula quantos dias faltam para a próxima sexta-feira
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7
    result.setDate(date.getDate() + daysUntilFriday)
  }

  return result
}

// Função para formatar data como DD/MM/YYYY
export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Função para converter string de data DD/MM/YYYY para objeto Date
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  // Formato esperado: "DD/MM/YYYY" ou "DD/MM/YYYY HH:MM"
  const parts = dateStr.split(" ")[0].split("/")
  if (parts.length !== 3) return null

  const day = Number.parseInt(parts[0], 10)
  const month = Number.parseInt(parts[1], 10) - 1 // Meses em JS são 0-indexed
  const year = Number.parseInt(parts[2], 10)

  return new Date(year, month, day)
}

// Função para inicializar pagamentos semanais com base na data de retirada
export function initializePayments(entry: Entry): PagamentoSemanal[] {
  const valorSemanal = parseValor(entry.valor_cobrado_semanal)
  const valorFormatado = formatValor(valorSemanal)

  // Obter a data de retirada
  const dataRetirada = parseDate(entry.data_retirada)
  if (!dataRetirada) {
    // Fallback para o caso de data inválida
    return Array.from({ length: 4 }, (_, i) => ({
      semana: i + 1,
      status: i === 0 ? "pendente" : "nao_pago",
      valor: valorFormatado,
      data: "",
    }))
  }

  // Obter a próxima sexta-feira após a data de retirada
  const proximaSexta = getNextFriday(dataRetirada)
  const dataProximaSexta = formatDate(proximaSexta)

  // Determinar a semana do mês da próxima sexta-feira
  const semanaProximaSexta = getWeekOfMonth(proximaSexta)

  // Criar array de pagamentos
  const pagamentos: PagamentoSemanal[] = []

  // Adicionar 4 semanas de pagamento
  for (let i = 0; i < 4; i++) {
    const semanaAtual = ((semanaProximaSexta + i - 1) % 4) + 1
    const dataPagamento = i === 0 ? dataProximaSexta : ""

    pagamentos.push({
      semana: semanaAtual,
      status: i === 0 ? "pendente" : "nao_pago",
      valor: valorFormatado,
      data: dataPagamento,
    })
  }

  // Ordenar por número da semana
  return pagamentos.sort((a, b) => a.semana - b.semana)
}

// Função para atualizar pagamentos quando o valor semanal muda
export function updatePaymentValues(pagamentos: PagamentoSemanal[], novoValorSemanal: string): PagamentoSemanal[] {
  const valorNumerico = parseValor(novoValorSemanal)
  const valorFormatado = formatValor(valorNumerico)

  return pagamentos.map((pagamento) => ({
    ...pagamento,
    valor: valorFormatado,
  }))
}

// Função para obter a próxima data de pagamento (próxima sexta-feira)
export function getNextPaymentDate(): string {
  const hoje = new Date()
  const proximaSexta = getNextFriday(hoje)
  return formatDate(proximaSexta)
}
