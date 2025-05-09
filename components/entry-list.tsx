"use client"

import { Switch } from "@/components/ui/switch"

import { AlertDescription } from "@/components/ui/alert"

import {
  Alert,
  // Removendo a importação duplicada de AlertDescription
} from "@/components/ui/alert"

import { useState, useRef } from "react"
import type { Entry, RenovacaoHistorico } from "@/types/entry"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Search,
  Filter,
  Clock,
  CalendarClock,
  RefreshCw,
  FileText,
  Star,
  Percent,
  Edit,
  UserPlus,
  AlertTriangle,
  Ban,
  CheckCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RenewDialog } from "./renew-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import PaymentControl from "./payment-control"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface EntryListProps {
  entries: Entry[]
  onRemove: (index: number) => void
  onUpdate: (index: number, updatedEntry: Entry) => void
  onEdit: (entry: Entry) => void
  onIndicacao: (indicadorCPF: string, indicadoCPF: string) => void
}

// Função para calcular dias até a data de devolução
const getDaysUntilReturn = (returnDateStr: string): number | null => {
  if (!returnDateStr) return null

  // Formato esperado: "22/03/2025 10:30"
  const parts = returnDateStr.split(" ")[0].split("/")
  if (parts.length !== 3) return null

  const day = Number.parseInt(parts[0])
  const month = Number.parseInt(parts[1]) - 1 // Meses em JS são 0-indexed
  const year = Number.parseInt(parts[2])

  const returnDate = new Date(year, month, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Resetar horas para comparar apenas datas

  const diffTime = returnDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// Função para determinar a urgência baseada nos dias restantes
const getUrgencyLevel = (daysLeft: number | null): "critical" | "warning" | "upcoming" | "normal" => {
  if (daysLeft === null) return "normal"
  if (daysLeft <= 3) return "critical"
  if (daysLeft <= 7) return "warning"
  if (daysLeft <= 14) return "upcoming"
  return "normal"
}

// Função para formatar a data atual
const getCurrentDateFormatted = (): string => {
  const now = new Date()
  const day = now.getDate().toString().padStart(2, "0")
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const year = now.getFullYear()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export default function EntryList({ entries, onRemove, onUpdate, onEdit, onIndicacao }: EntryListProps) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [filterField, setFilterField] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<string>("default")
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<{ entry: Entry; index: number } | null>(null)
  const [renewTextDialogOpen, setRenewTextDialogOpen] = useState(false)
  const [renewText, setRenewText] = useState("")
  const renewTextRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Estado para o diálogo de indicação
  const [indicacaoDialogOpen, setIndicacaoDialogOpen] = useState(false)
  const [indicadorEntry, setIndicadorEntry] = useState<{ entry: Entry; index: number } | null>(null)
  const [indicadoCPF, setIndicadoCPF] = useState<string>("")

  // Estado para o diálogo de definir indicador
  const [definirIndicadorDialogOpen, setDefinirIndicadorDialogOpen] = useState(false)
  const [clienteParaIndicador, setClienteParaIndicador] = useState<{ entry: Entry; index: number } | null>(null)
  const [indicadorSelecionadoCPF, setIndicadorSelecionadoCPF] = useState<string>("")

  // Novo estado para o diálogo de alteração de status
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusEntry, setStatusEntry] = useState<{ entry: Entry; index: number } | null>(null)
  const [statusAtivo, setStatusAtivo] = useState(true)
  const [statusMotivo, setStatusMotivo] = useState("")

  // Calcular dias restantes para cada entrada
  const entriesWithDaysLeft = entries.map((entry) => {
    const daysLeft = getDaysUntilReturn(entry.data_devolucao)
    const urgency = getUrgencyLevel(daysLeft)
    return { ...entry, daysLeft, urgency }
  })

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const newState = { ...prev }
      newState[index] = !prev[index]
      return newState
    })
  }

  const copyToClipboard = (entry: Entry) => {
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2))
    toast({
      title: "Copiado!",
      description: "JSON copiado para a área de transferência",
      duration: 3000,
    })
  }

  const handleRenew = (entry: Entry, index: number) => {
    setSelectedEntry({ entry, index })
    setRenewDialogOpen(true)
  }

  const handleEdit = (entry: Entry) => {
    onEdit(entry)
  }

  // Nova função para abrir o diálogo de alteração de status
  const handleStatusChange = (entry: Entry, index: number) => {
    setStatusEntry({ entry, index })
    setStatusAtivo(entry.ativo !== false) // Se não estiver definido, assume true
    setStatusMotivo(entry.motivoInativacao || "")
    setStatusDialogOpen(true)
  }

  // Nova função para salvar a alteração de status
  const saveStatusChange = () => {
    if (!statusEntry) return

    const { entry, index } = statusEntry
    const updatedEntry = { ...entry, ativo: statusAtivo }

    if (!statusAtivo) {
      updatedEntry.motivoInativacao = statusMotivo
    } else {
      delete updatedEntry.motivoInativacao
    }

    onUpdate(index, updatedEntry)
    setStatusDialogOpen(false)

    toast({
      title: statusAtivo ? "Perfil ativado" : "Perfil desativado",
      description: statusAtivo ? `${entry.nome} foi marcado como ativo.` : `${entry.nome} foi marcado como inativo.`,
      duration: 3000,
    })
  }

  // Função para abrir o diálogo de indicação
  const handleIndicacao = (entry: Entry, index: number) => {
    if (!entry.podeIndicar) {
      toast({
        title: "Operação não permitida",
        description: "Este cliente não tem permissão para indicar outros.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIndicadorEntry({ entry, index })
    setIndicadoCPF("")
    setIndicacaoDialogOpen(true)
  }

  // Adicionar função para abrir o diálogo de definir indicador
  const handleDefinirIndicador = (entry: Entry, index: number) => {
    setClienteParaIndicador({ entry, index })
    setIndicadorSelecionadoCPF(entry.indicadoPor || "")
    setDefinirIndicadorDialogOpen(true)
  }

  // Função para processar a indicação
  const processarIndicacao = () => {
    if (!indicadorEntry || !indicadoCPF) return

    // Verificar se o cliente já foi indicado
    if (indicadorEntry.entry.indicacoes?.includes(indicadoCPF)) {
      toast({
        title: "Cliente já indicado",
        description: "Este cliente já foi indicado anteriormente.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Verificar se o cliente está tentando se indicar
    if (indicadorEntry.entry.login_cpf === indicadoCPF) {
      toast({
        title: "Operação não permitida",
        description: "Um cliente não pode indicar a si mesmo.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Processar a indicação
    onIndicacao(indicadorEntry.entry.login_cpf, indicadoCPF)

    // Fechar o diálogo
    setIndicacaoDialogOpen(false)

    toast({
      title: "Indicação processada",
      description: "A indicação foi processada com sucesso.",
      duration: 3000,
    })
  }

  // Adicionar função para processar a definição de indicador
  const processarDefinicaoIndicador = () => {
    if (!clienteParaIndicador) return

    const index = clienteParaIndicador.index
    const entry = clienteParaIndicador.entry

    // Se selecionou "Ninguém", remover o indicador
    if (indicadorSelecionadoCPF === "none") {
      const updatedEntry = { ...entry }
      delete updatedEntry.indicadoPor

      onUpdate(index, updatedEntry)

      toast({
        title: "Indicador removido",
        description: `O indicador foi removido de ${entry.nome}.`,
        duration: 3000,
      })
    }
    // Se selecionou um indicador
    else if (indicadorSelecionadoCPF) {
      // Verificar se o cliente está tentando se auto-indicar
      if (indicadorSelecionadoCPF === entry.login_cpf) {
        toast({
          title: "Operação não permitida",
          description: "Um cliente não pode indicar a si mesmo.",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      // Atualizar o cliente com o novo indicador
      const updatedEntry = {
        ...entry,
        indicadoPor: indicadorSelecionadoCPF,
      }

      onUpdate(index, updatedEntry)

      // Processar a indicação para aplicar desconto ao indicador
      onIndicacao(indicadorSelecionadoCPF, entry.login_cpf)

      toast({
        title: "Indicador definido",
        description: `O indicador foi definido para ${entry.nome}.`,
        duration: 3000,
      })
    }

    setDefinirIndicadorDialogOpen(false)
  }

  const processRenewal = (entry: Entry, newDate: string, cardBrand: string, cardLastDigits: string) => {
    if (!selectedEntry) return

    const index = selectedEntry.index
    const currentDate = getCurrentDateFormatted()

    // Criar novo objeto de renovação
    const renovacao: RenovacaoHistorico = {
      dataAnterior: entry.data_devolucao,
      dataNova: newDate,
      dataRenovacao: currentDate,
      cartaoBandeira: cardBrand,
      cartaoFinal: cardLastDigits,
    }

    // Atualizar arrays de cartões se o cartão não existir ainda
    const cartoesBandeira = [...(entry.cartoes_usado_bandeira || [])]
    const cartoesNumero = [...(entry.final_cartoes_usado_numero || [])]

    if (!cardBrand && !cartoesBandeira.includes(cardBrand)) {
      cartoesBandeira.push(cardBrand)
    }

    if (!cartoesNumero.includes(cardLastDigits)) {
      cartoesNumero.push(cardLastDigits)
    }

    // Criar cópia do entry com o histórico atualizado
    const updatedEntry: Entry = {
      ...entry,
      data_devolucao: newDate,
      data_apos_renovacao: entry.data_devolucao,
      cartoes_usado_bandeira: cartoesBandeira,
      final_cartoes_usado_numero: cartoesNumero,
      historicoRenovacoes: [...(entry.historicoRenovacoes || []), renovacao],
    }

    // Atualizar o entry
    onUpdate(index, updatedEntry)

    // Gerar texto de renovação
    const dataParts = newDate.split(" ")[0].split("/")
    const timePart = newDate.split(" ")[1]
    const formattedDate = `${dataParts[0]}/${dataParts[1]} ${timePart}`

    const renewalText = `RENOVAÇÃO
NOME: ${entry.nome}
LOGIN CPF: ${entry.login_cpf}
SENHA: ${entry.senha}
DIA: ${formattedDate}`

    setRenewText(renewalText)
    setRenewTextDialogOpen(true)

    toast({
      title: "Cadastro renovado",
      description: `Nova data de devolução: ${newDate}`,
      duration: 3000,
    })
  }

  const copyRenewText = () => {
    navigator.clipboard.writeText(renewText)
    toast({
      title: "Texto copiado!",
      description: "Texto de renovação copiado para a área de transferência",
      duration: 3000,
    })
  }

  const generateRenewText = (entry: Entry) => {
    const dataParts = entry.data_devolucao.split(" ")[0].split("/")
    const timePart = entry.data_devolucao.split(" ")[1]
    const formattedDate = `${dataParts[0]}/${dataParts[1]} ${timePart}`

    const renewalText = `RENOVAÇÃO
NOME: ${entry.nome}
LOGIN CPF: ${entry.login_cpf}
SENHA: ${entry.senha}
DIA: ${formattedDate}`

    setRenewText(renewalText)
    setRenewTextDialogOpen(true)
  }

  // Filtrar entradas com base no termo de busca e modo de visualização
  const filteredEntries = entriesWithDaysLeft.filter((entry) => {
    // Primeiro aplicar filtro de visualização
    if (viewMode === "upcoming") {
      if (entry.urgency === "normal") return false
    } else if (viewMode === "critical") {
      if (entry.urgency !== "critical" && entry.urgency !== "warning") return false
    } else if (viewMode === "active") {
      if (entry.ativo === false) return false
    } else if (viewMode === "inactive") {
      if (entry.ativo !== false) return false
    }

    // Depois aplicar filtro de busca
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()

    if (filterField) {
      // Se um campo específico foi selecionado para filtrar
      const value = String((entry as any)[filterField] || "").toLowerCase()
      return value.includes(searchLower)
    } else {
      // Busca em todos os campos de texto
      return (
        entry.nome.toLowerCase().includes(searchLower) ||
        entry.login_cpf.toLowerCase().includes(searchLower) ||
        entry.categoria_carro.toLowerCase().includes(searchLower) ||
        entry.local_retirada.toLowerCase().includes(searchLower) ||
        (entry.motivoInativacao && entry.motivoInativacao.toLowerCase().includes(searchLower))
      )
    }
  })

  // Ordenar entradas
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortOrder === "date-asc") {
      // Ordenar por data de devolução (mais próxima primeiro)
      return (
        (a.daysLeft === null ? Number.POSITIVE_INFINITY : a.daysLeft) -
        (b.daysLeft === null ? Number.POSITIVE_INFINITY : b.daysLeft)
      )
    } else if (sortOrder === "date-desc") {
      // Ordenar por data de devolução (mais distante primeiro)
      return (
        (b.daysLeft === null ? Number.NEGATIVE_INFINITY : b.daysLeft) -
        (a.daysLeft === null ? Number.NEGATIVE_INFINITY : a.daysLeft)
      )
    } else if (sortOrder === "urgency") {
      // Ordenar por urgência
      const urgencyOrder = { critical: 0, warning: 1, upcoming: 2, normal: 3 }
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    } else if (sortOrder === "status") {
      // Ordenar por status (ativos primeiro)
      const aStatus = a.ativo !== false
      const bStatus = b.ativo !== false
      return aStatus === bStatus ? 0 : aStatus ? -1 : 1
    }
    // Padrão: manter ordem original
    return 0
  })

  // Estatísticas de renovação
  const criticalCount = entriesWithDaysLeft.filter((e) => e.urgency === "critical").length
  const warningCount = entriesWithDaysLeft.filter((e) => e.urgency === "warning").length
  const upcomingCount = entriesWithDaysLeft.filter((e) => e.urgency === "upcoming").length

  // Estatísticas de status
  const activeCount = entriesWithDaysLeft.filter((e) => e.ativo !== false).length
  const inactiveCount = entriesWithDaysLeft.filter((e) => e.ativo === false).length

  // Encontrar o nome do indicador a partir do CPF
  const getIndicadorNome = (cpf: string | undefined) => {
    if (!cpf) return null
    const indicador = entries.find((entry) => entry.login_cpf === cpf)
    return indicador ? indicador.nome : null
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhum cadastro adicionado. Use a aba "Novo Cadastro" para adicionar.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" value={viewMode} onValueChange={setViewMode}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-1">
            Todos
            <Badge variant="outline">{entries.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-1">
            Ativos
            <Badge variant="outline">{activeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-1">
            Inativos
            <Badge variant="outline">{inactiveCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-1">
            Próximos
            <Badge variant="outline">{upcomingCount + warningCount + criticalCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="critical" className="flex items-center gap-1">
            Urgentes
            <Badge variant="outline">{criticalCount + warningCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cadastros..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex gap-1">
                <Filter className="h-4 w-4" />
                {filterField ? `Filtrar: ${filterField}` : "Filtrar"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterField(null)}>Todos os campos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterField("nome")}>Nome</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterField("login_cpf")}>CPF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterField("categoria_carro")}>Categoria do Carro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterField("local_retirada")}>Local de Retirada</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterField("motivoInativacao")}>
                Motivo de Inativação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex gap-1">
                <CalendarClock className="h-4 w-4" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup value={sortOrder} onValueChange={setSortOrder}>
                <DropdownMenuRadioItem value="default">Padrão</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="urgency">Por urgência</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date-asc">Data mais próxima</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date-desc">Data mais distante</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="status">Por status (ativos primeiro)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedEntries.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Nenhum resultado encontrado para sua busca.</p>
            </CardContent>
          </Card>
        ) : (
          sortedEntries.map((entry, index) => {
            const originalIndex = entries.findIndex((e) => e.nome === entry.nome && e.login_cpf === entry.login_cpf)

            // Determinar classes de estilo baseadas na urgência
            let urgencyClass = ""
            let urgencyBadge = null

            if (entry.urgency === "critical") {
              urgencyClass = "border-l-4 border-red-500 dark:border-red-400"
              urgencyBadge = (
                <Badge variant="destructive" className="absolute top-2 right-2">
                  {entry.daysLeft <= 0 ? "Vencido" : `${entry.daysLeft} dias`}
                </Badge>
              )
            } else if (entry.urgency === "warning") {
              urgencyClass = "border-l-4 border-orange-500 dark:border-orange-400"
              urgencyBadge = (
                <Badge
                  variant="outline"
                  className="absolute top-2 right-2 border-orange-500 text-orange-500 dark:border-orange-400 dark:text-orange-400"
                >
                  {entry.daysLeft} dias
                </Badge>
              )
            } else if (entry.urgency === "upcoming") {
              urgencyClass = "border-l-4 border-yellow-500 dark:border-yellow-400"
              urgencyBadge = (
                <Badge
                  variant="outline"
                  className="absolute top-2 right-2 border-yellow-500 text-yellow-500 dark:border-yellow-400 dark:text-yellow-400"
                >
                  {entry.daysLeft} dias
                </Badge>
              )
            }

            // Adicionar classe para perfis inativos
            if (entry.ativo === false) {
              urgencyClass += " bg-gray-100 dark:bg-gray-800/50 opacity-75"
            }

            // Obter nome do indicador
            const indicadorNome = getIndicadorNome(entry.indicadoPor)

            // Verificar se tem desconto aplicado
            const temDesconto = entry.descontoAplicado && entry.valorDesconto

            return (
              <Card key={index} className={`relative ${urgencyClass} transition-all hover:shadow-md`}>
                {urgencyBadge}

                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-1">
                        {entry.nome}
                        {entry.podeIndicar && (
                          <button
                            onClick={() => handleIndicacao(entry, originalIndex)}
                            className="cursor-pointer"
                            title="Clique para indicar um cliente"
                          >
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 hover:text-yellow-600 hover:fill-yellow-600" />
                          </button>
                        )}
                        {temDesconto && <Percent className="h-4 w-4 text-green-500" title="Desconto aplicado" />}
                        {entry.ativo === false && <Ban className="h-4 w-4 text-red-500 ml-1" title="Perfil inativo" />}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">CPF: {entry.login_cpf}</p>
                      {indicadorNome && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Indicado por: <span className="font-medium">{indicadorNome}</span>
                        </p>
                      )}

                      {/* Exibir status do perfil */}
                      <div className="mt-1">
                        {entry.ativo === false ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1"
                          >
                            <Ban className="h-3 w-3" /> Inativo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" /> Ativo
                          </Badge>
                        )}
                      </div>

                      {/* Exibir motivo da inativação se existir */}
                      {entry.ativo === false && entry.motivoInativacao && (
                        <p className="text-xs text-red-600 mt-1 italic">Motivo: {entry.motivoInativacao}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2">
                            Ações
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(entry)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar cadastro
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(entry, originalIndex)}>
                            {entry.ativo === false ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Ativar perfil
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2 text-red-500" /> Desativar perfil
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => generateRenewText(entry)}>
                            <FileText className="h-4 w-4 mr-2" /> Gerar texto de renovação
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRenew(entry, originalIndex)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Renovar cadastro
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => copyToClipboard(entry)}>
                            <Copy className="h-4 w-4 mr-2" /> Copiar JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRemove(originalIndex)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Remover cadastro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    <div>
                      <p className="text-sm font-medium">Categoria:</p>
                      <p className="text-sm">{entry.categoria_carro || "Não especificada"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Local de Retirada:</p>
                      <p className="text-sm">{entry.local_retirada}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Data de Retirada:</p>
                      <p className="text-sm">{entry.data_retirada}</p>
                    </div>
                    <div className="relative">
                      <p className="text-sm font-medium flex items-center gap-1">
                        Data de Devolução:
                        {entry.urgency !== "normal" && (
                          <Clock
                            className={`h-4 w-4 ${
                              entry.urgency === "critical"
                                ? "text-destructive"
                                : entry.urgency === "warning"
                                  ? "text-orange-500"
                                  : "text-yellow-500"
                            }`}
                          />
                        )}
                      </p>
                      <p
                        className={`text-sm ${
                          entry.urgency === "critical"
                            ? "font-bold text-destructive"
                            : entry.urgency === "warning"
                              ? "font-semibold text-orange-500"
                              : entry.urgency === "upcoming"
                                ? "text-yellow-500"
                                : ""
                        }`}
                      >
                        {entry.data_devolucao}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={temDesconto ? "bg-green-50 text-green-700 border-green-200" : ""}
                    >
                      Valor: {entry.valor_cobrado_total}
                      {temDesconto && entry.valorOriginal && (
                        <span className="ml-1 line-through text-muted-foreground">{entry.valorOriginal}</span>
                      )}
                    </Badge>
                    {temDesconto && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Desconto: {entry.valorDesconto}
                      </Badge>
                    )}
                    {entry.cartoes_usado_bandeira?.map((bandeira, i) => (
                      <Badge key={i} variant="secondary">
                        {bandeira}
                      </Badge>
                    ))}
                  </div>

                  {/* Seção de detalhes completos */}
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex gap-1 w-full justify-between"
                      onClick={() => toggleItem(index)}
                    >
                      <span>Detalhes Completos</span>
                      {openItems[index] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {openItems[index] && (
                      <div className="space-y-4 mt-2 p-4 bg-muted rounded-md">
                        {/* Informações dos cartões */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Cartões Utilizados</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs font-medium">Bandeiras:</p>
                              <ul className="list-disc list-inside text-xs">
                                {entry.cartoes_usado_bandeira && entry.cartoes_usado_bandeira.length > 0 ? (
                                  entry.cartoes_usado_bandeira.map((bandeira, i) => <li key={i}>{bandeira}</li>)
                                ) : (
                                  <li className="text-muted-foreground">Nenhuma bandeira registrada</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-medium">Finais dos Cartões:</p>
                              <ul className="list-disc list-inside text-xs">
                                {entry.final_cartoes_usado_numero && entry.final_cartoes_usado_numero.length > 0 ? (
                                  entry.final_cartoes_usado_numero.map((final, i) => <li key={i}>{final}</li>)
                                ) : (
                                  <li className="text-muted-foreground">Nenhum final registrado</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Histórico de renovações */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Histórico de Renovações</h4>
                          {entry.historicoRenovacoes && entry.historicoRenovacoes.length > 0 ? (
                            <div className="space-y-2">
                              {entry.historicoRenovacoes.map((renovacao, i) => (
                                <div key={i} className="bg-background p-2 rounded-sm text-xs">
                                  <p className="font-medium">Renovação em: {renovacao.dataRenovacao}</p>
                                  <div className="grid grid-cols-2 gap-1 mt-1">
                                    <p>De: {renovacao.dataAnterior}</p>
                                    <p>Para: {renovacao.dataNova}</p>
                                  </div>
                                  {renovacao.cartaoBandeira && renovacao.cartaoFinal && (
                                    <p className="mt-1">
                                      Cartão: {renovacao.cartaoBandeira} ({renovacao.cartaoFinal})
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhuma renovação registrada</p>
                          )}
                        </div>

                        {/* Controle de pagamentos */}
                        <div className="mt-4">
                          <PaymentControl
                            entry={entry}
                            onUpdate={(updatedEntry) => onUpdate(originalIndex, updatedEntry)}
                          />
                        </div>

                        {/* Informações de indicação */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center justify-between">
                            <span>Indicação</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 py-0 text-xs"
                              onClick={() => handleDefinirIndicador(entry, originalIndex)}
                            >
                              {entry.indicadoPor ? "Alterar Indicador" : "Definir Indicador"}
                            </Button>
                          </h4>
                          {entry.indicadoPor ? (
                            <p className="text-xs">
                              Indicado por: <span className="font-medium">{getIndicadorNome(entry.indicadoPor)}</span> (
                              {entry.indicadoPor})
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhum indicador definido</p>
                          )}
                        </div>

                        {/* Indicações feitas */}
                        {entry.podeIndicar && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              Indicações Feitas
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-2 h-6 px-2 py-0 text-xs"
                                onClick={() => handleIndicacao(entry, originalIndex)}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Indicar
                              </Button>
                            </h4>
                            {entry.indicacoes && entry.indicacoes.length > 0 ? (
                              <div className="space-y-1">
                                {entry.indicacoes.map((cpf, i) => {
                                  const indicado = entries.find((e) => e.login_cpf === cpf)
                                  return (
                                    <div key={i} className="text-xs bg-background p-2 rounded-sm">
                                      <p>
                                        <span className="font-medium">{indicado?.nome || "Cliente"}</span> ({cpf})
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Este cliente ainda não indicou ninguém.</p>
                            )}
                          </div>
                        )}

                        {/* Status do perfil */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center justify-between">
                            <span>Status do Perfil</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 py-0 text-xs"
                              onClick={() => handleStatusChange(entry, originalIndex)}
                            >
                              {entry.ativo === false ? "Ativar Perfil" : "Desativar Perfil"}
                            </Button>
                          </h4>
                          <div className="bg-background p-2 rounded-sm">
                            <div className="flex items-center gap-2">
                              {entry.ativo === false ? (
                                <>
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    <Ban className="h-3 w-3 mr-1" /> Inativo
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Este perfil está marcado como inativo
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Ativo
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Este perfil está ativo e funcionando normalmente
                                  </span>
                                </>
                              )}
                            </div>

                            {entry.ativo === false && entry.motivoInativacao && (
                              <div className="mt-2">
                                <p className="text-xs font-medium">Motivo da inativação:</p>
                                <p className="text-xs text-red-600 mt-1">{entry.motivoInativacao}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {entry.observacoes && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Observações</h4>
                            <div className="bg-background p-2 rounded-sm">
                              <p className="text-xs whitespace-pre-wrap">{entry.observacoes}</p>
                            </div>
                          </div>
                        )}

                        {/* JSON completo */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Dados Completos (JSON)</h4>
                          <div className="bg-background p-2 rounded-sm overflow-x-auto">
                            <pre className="text-xs">{JSON.stringify(entry, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Diálogo de renovação */}
      {selectedEntry && (
        <RenewDialog
          entry={selectedEntry.entry}
          isOpen={renewDialogOpen}
          onClose={() => setRenewDialogOpen(false)}
          onRenew={processRenewal}
        />
      )}

      {/* Diálogo de texto de renovação */}
      <Dialog open={renewTextDialogOpen} onOpenChange={setRenewTextDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Texto de Renovação</DialogTitle>
            <DialogDescription>Copie o texto abaixo para compartilhar as informações de renovação</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div ref={renewTextRef} className="bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-line">
              {renewText}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={copyRenewText} className="w-full sm:w-auto">
              <Copy className="mr-2 h-4 w-4" />
              Copiar Texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de indicação */}
      <Dialog open={indicacaoDialogOpen} onOpenChange={setIndicacaoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Indicar Cliente</DialogTitle>
            <DialogDescription>Selecione o cliente que foi indicado por {indicadorEntry?.entry.nome}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="indicado">Cliente Indicado</Label>
              <Select value={indicadoCPF} onValueChange={setIndicadoCPF}>
                <SelectTrigger id="indicado">
                  <SelectValue placeholder="Selecione o cliente indicado" />
                </SelectTrigger>
                <SelectContent>
                  {entries
                    .filter(
                      (e) =>
                        e.login_cpf !== indicadorEntry?.entry.login_cpf &&
                        !indicadorEntry?.entry.indicacoes?.includes(e.login_cpf),
                    )
                    .map((entry) => (
                      <SelectItem key={entry.login_cpf} value={entry.login_cpf}>
                        {entry.nome} ({entry.login_cpf})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <AlertDescription>
                O cliente que fez a indicação ({indicadorEntry?.entry.nome}) receberá um desconto automaticamente.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndicacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={processarIndicacao} disabled={!indicadoCPF}>
              Confirmar Indicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de definir indicador */}
      <Dialog open={definirIndicadorDialogOpen} onOpenChange={setDefinirIndicadorDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Definir Indicador</DialogTitle>
            <DialogDescription>Selecione quem indicou {clienteParaIndicador?.entry.nome}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="indicador">Indicado por</Label>
              <Select value={indicadorSelecionadoCPF} onValueChange={setIndicadorSelecionadoCPF}>
                <SelectTrigger id="indicador">
                  <SelectValue placeholder="Selecione quem indicou" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguém (remover indicador)</SelectItem>
                  {entries
                    .filter((e) => e.podeIndicar && e.login_cpf !== clienteParaIndicador?.entry.login_cpf)
                    .map((entry) => (
                      <SelectItem key={entry.login_cpf} value={entry.login_cpf}>
                        {entry.nome} ({entry.login_cpf}) ⭐
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {indicadorSelecionadoCPF && indicadorSelecionadoCPF !== "none" && (
              <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <AlertDescription>O cliente que fez a indicação receberá um desconto automaticamente.</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDefinirIndicadorDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={processarDefinicaoIndicador}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de alteração de status */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{statusAtivo ? "Ativar Perfil" : "Desativar Perfil"}</DialogTitle>
            <DialogDescription>
              {statusAtivo
                ? `Confirme a ativação do perfil de ${statusEntry?.entry.nome}`
                : `Explique o motivo da desativação do perfil de ${statusEntry?.entry.nome}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="status-ativo" checked={statusAtivo} onCheckedChange={setStatusAtivo} />
              <Label htmlFor="status-ativo">{statusAtivo ? "Perfil Ativo" : "Perfil Inativo"}</Label>
            </div>

            {!statusAtivo && (
              <div className="space-y-2">
                <Label htmlFor="status-motivo">Motivo da Inativação</Label>
                <Textarea
                  id="status-motivo"
                  value={statusMotivo}
                  onChange={(e) => setStatusMotivo(e.target.value)}
                  placeholder="Explique o motivo da inativação deste cliente"
                  className="h-24"
                />
              </div>
            )}

            {!statusAtivo && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Perfis inativos permanecem no sistema, mas são visualmente marcados e podem ser filtrados
                  separadamente.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveStatusChange}>{statusAtivo ? "Ativar Perfil" : "Desativar Perfil"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
