export interface RenovacaoHistorico {
  dataAnterior: string
  dataNova: string
  dataRenovacao: string // Data em que a renovação foi feita
  cartaoBandeira?: string // Bandeira do cartão usado na renovação
  cartaoFinal?: string // Final do cartão usado na renovação
}

export interface PagamentoSemanal {
  semana: number // 1, 2, 3 ou 4
  status: "pago" | "pendente" | "nao_pago"
  valor: string
  data: string // Data do pagamento ou previsão
  observacao?: string
}

export interface Entry {
  valor_cobrado_total: string
  valor_cobrado_semanal: string
  nome: string
  login_cpf: string
  senha: string
  categoria_carro: string
  local_retirada: string
  data_retirada: string
  data_devolucao: string
  data_apos_renovacao: string | null
  cartoes_usado_bandeira: string[]
  final_cartoes_usado_numero: string[]
  historicoRenovacoes?: RenovacaoHistorico[] // Novo campo para histórico de renovações
  indicadoPor?: string // CPF da pessoa que indicou
  pagamentos?: PagamentoSemanal[] // Controle de pagamentos semanais
  podeIndicar?: boolean // Novo campo para indicar se o usuário pode indicar outros
  valorDesconto?: string // Valor do desconto aplicado (se foi indicado)
  descontoAplicado?: boolean // Indica se o desconto já foi aplicado no valor total
  valorOriginal?: string // Valor original antes do desconto
  indicacoes?: string[] // Lista de CPFs das pessoas indicadas por este cliente
  observacoes?: string // Campo para observações gerais sobre o cliente
  ativo?: boolean // Indica se o perfil está ativo ou inativo
  motivoInativacao?: string // Motivo da inativação do perfil
}

// Interface para perfis pendentes (não confirmados)
export interface PerfilPendente {
  id: string // ID único para o perfil pendente
  nome: string
  contato: string // Telefone ou outro meio de contato
  cpf?: string
  observacoes: string
  dataCriacao: string
  status: "pendente" | "em_contato" | "desistiu"
}

// Interfaces para o sistema financeiro
export interface ResumoFinanceiro {
  totalRecebido: number
  totalDescontos: number
  totalLiquido: number
  pagamentosPorSemana: {
    semana: number
    total: number
    pagos: number
    pendentes: number
    naoPagos: number
  }[]
  pagamentosPorMes: {
    mes: string
    total: number
    pagos: number
    pendentes: number
    naoPagos: number
  }[]
}
