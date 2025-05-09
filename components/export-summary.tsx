"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Download, FileText, Upload, AlertTriangle, Calendar } from "lucide-react"
import type { Entry } from "@/types/entry"
import { useToast } from "@/hooks/use-toast"
import { parseValor } from "@/utils/finance-utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SystemSettings } from "./system-settings"

interface ExportSummaryProps {
  entries: Entry[]
  onImport: (importedEntries: Entry[]) => void
  systemSettings: SystemSettings
}

export default function ExportSummary({ entries, onImport, systemSettings }: ExportSummaryProps) {
  const [summaryText, setSummaryText] = useState<string>("")
  const [paymentListText, setPaymentListText] = useState<string>("")
  const [importText, setImportText] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("export")
  const [exportTab, setExportTab] = useState<string>("full")
  const [importPreview, setImportPreview] = useState<Entry[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace")

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const paymentListRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

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

  // Função para calcular há quanto tempo o cliente está cadastrado
  const getTimeWithUs = (startDateStr: string): string => {
    if (!startDateStr) return "Não disponível"

    // Formato esperado: "22/03/2025 10:30"
    const parts = startDateStr.split(" ")[0].split("/")
    if (parts.length !== 3) return "Formato de data inválido"

    const day = Number.parseInt(parts[0])
    const month = Number.parseInt(parts[1]) - 1 // Meses em JS são 0-indexed
    const year = Number.parseInt(parts[2])

    const startDate = new Date(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Resetar horas para comparar apenas datas

    const diffTime = today.getTime() - startDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "Data futura"

    const months = Math.floor(diffDays / 30)
    const remainingDays = diffDays % 30

    if (months > 0) {
      return `${months} mês(es) e ${remainingDays} dia(s)`
    } else {
      return `${diffDays} dia(s)`
    }
  }

  // Função para calcular o total já pago pelo cliente
  const getTotalPaid = (entry: Entry): { valor: number; semanas: number; total: number } => {
    if (!entry.pagamentos || entry.pagamentos.length === 0) {
      return { valor: 0, semanas: 0, total: 0 }
    }

    const pagos = entry.pagamentos.filter((p) => p.status === "pago")
    const valorSemanal = parseValor(entry.valor_cobrado_semanal)
    const totalPago = pagos.reduce((acc, p) => acc + parseValor(p.valor), 0)

    return {
      valor: valorSemanal,
      semanas: pagos.length,
      total: totalPago,
    }
  }

  // Gerar o resumo de todos os cadastros
  const generateSummary = () => {
    if (entries.length === 0) {
      toast({
        title: "Nenhum cadastro encontrado",
        description: "Adicione cadastros antes de gerar o resumo.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Ordenar entradas por data de devolução (as mais próximas primeiro)
    const sortedEntries = [...entries].sort((a, b) => {
      const daysA = getDaysUntilReturn(a.data_devolucao) || Number.MAX_SAFE_INTEGER
      const daysB = getDaysUntilReturn(b.data_devolucao) || Number.MAX_SAFE_INTEGER
      return daysA - daysB
    })

    let summary = "RESUMO DE CADASTROS - GERADO EM " + new Date().toLocaleDateString() + "\n\n"

    // Adicionar seção de avisos para renovações urgentes
    const urgentRenewals = sortedEntries.filter((entry) => {
      const days = getDaysUntilReturn(entry.data_devolucao)
      return days !== null && days <= 7
    })

    if (urgentRenewals.length > 0) {
      summary += "⚠️ ATENÇÃO: RENOVAÇÕES URGENTES ⚠️\n"
      urgentRenewals.forEach((entry) => {
        const days = getDaysUntilReturn(entry.data_devolucao)
        summary += `- ${entry.nome} (${days} dia(s) restante(s)) - Devolução: ${entry.data_devolucao}\n`
      })
      summary += "\n---------------------------------------------------\n\n"
    }

    sortedEntries.forEach((entry, index) => {
      // Calcular dias até a renovação
      const daysUntilReturn = getDaysUntilReturn(entry.data_devolucao)
      const renewalWarning =
        daysUntilReturn !== null && daysUntilReturn <= 14 ? `⚠️ ATENÇÃO: RENOVAÇÃO EM ${daysUntilReturn} DIA(S) ⚠️\n` : ""

      // Calcular tempo com a gente
      const timeWithUs = getTimeWithUs(entry.data_retirada)

      // Calcular total pago
      const paymentInfo = getTotalPaid(entry)
      const paymentSummary =
        paymentInfo.semanas > 0
          ? `PAGAMENTO: ${paymentInfo.semanas} SEMANA(S) PAGA(S) - TOTAL R$ ${paymentInfo.total.toFixed(2).replace(".", ",")}\n`
          : "PAGAMENTO: NENHUMA SEMANA PAGA AINDA\n"

      // Calcular informações de desconto
      const descontoInfo =
        entry.descontoAplicado && entry.valorDesconto
          ? `    ${entry.valorDesconto} DESCONTOS DE INDICAÇÃO ${entry.valor_cobrado_total}`
          : ""

      // Calcular informações de pagamento semanal
      const pagamentoInfo =
        entry.pagamentos && entry.pagamentos.length > 0
          ? `    ${entry.pagamentos.filter((p) => p.status === "pago").length} SEMANAS PAGAS DE ${entry.pagamentos.length}`
          : ""

      // Adicionar informações de status do perfil
      const statusInfo =
        entry.ativo === false
          ? `\nSTATUS: INATIVO\nMOTIVO DE DESATIVAÇÃO: ${entry.motivoInativacao || "Não informado"}`
          : "\nSTATUS: ATIVO"

      // Formatar o resumo para este cadastro
      const entrySummary = `${renewalWarning}CLIENTE HÁ: ${timeWithUs}\n${paymentSummary}VALOR COBRADO TOTAL:   ${entry.valorOriginal || entry.valor_cobrado_total}${descontoInfo}
VALOR COBRADO SEMANAL: ${entry.valor_cobrado_semanal}${pagamentoInfo}
NOME: ${entry.nome}
LOGIN CPF: ${entry.login_cpf}
SENHA: ${entry.senha}
CATEGORIA CARRO: ${entry.categoria_carro || ""}
LOCAL RETIRADA: ${entry.local_retirada}
DATA RETIRADA: ${entry.data_retirada}
DATA DEVOLUÇÃO: ${entry.data_devolucao}
${entry.data_apos_renovacao ? `DATA APOS RENOVAÇÃO: ${entry.data_apos_renovacao}` : ""}
${
  entry.historicoRenovacoes && entry.historicoRenovacoes.length > 0
    ? entry.historicoRenovacoes.map((r) => `DATA APOS RENOVAÇÃO: ${r.dataNova}`).join("\n")
    : ""
}
CARTÕES USADO BANDEIRA: ${entry.cartoes_usado_bandeira?.join(", ") || ""}
FINAL CARTOES USADO NÚMERO: ${entry.final_cartoes_usado_numero?.join(", ") || ""}
${entry.indicadoPor ? `INDICADO POR: ${entry.indicadoPor}` : ""}
${entry.indicacoes && entry.indicacoes.length > 0 ? `INDICAÇÕES: ${entry.indicacoes.join(", ")}` : ""}${statusInfo}
${entry.observacoes ? `\nOBSERVAÇÕES:\n${entry.observacoes}` : ""}
`

      // Adicionar ao resumo geral
      summary += entrySummary

      // Adicionar separador entre cadastros, exceto para o último
      if (index < sortedEntries.length - 1) {
        summary += "\n---------------------------------------------------\n\n"
      }
    })

    setSummaryText(summary)
  }

  // Gerar lista de pagamentos para sexta-feira
  const generatePaymentList = () => {
    if (entries.length === 0) {
      toast({
        title: "Nenhum cadastro encontrado",
        description: "Adicione cadastros antes de gerar a lista de pagamentos.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Obter a data atual
    const today = new Date()
    const formattedDate = today.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Calcular o total a receber
    let totalAReceber = 0
    const clientesComPagamento = entries.filter((entry) => {
      // Verificar se tem pagamentos pendentes
      if (!entry.pagamentos) return false
      return entry.pagamentos.some((p) => p.status === "pendente" || p.status === "nao_pago")
    })

    clientesComPagamento.forEach((entry) => {
      const valorSemanal = parseValor(entry.valor_cobrado_semanal)
      const pagamentosPendentes =
        entry.pagamentos?.filter((p) => p.status === "pendente" || p.status === "nao_pago") || []
      totalAReceber += valorSemanal * pagamentosPendentes.length
    })

    // Criar o cabeçalho da lista
    let paymentList = `📅 LISTA DE PAGAMENTOS - ${formattedDate.toUpperCase()} 📅\n\n`
    paymentList += `🔔 HOJE É DIA DE PAGAMENTO (${systemSettings.paymentDay.toUpperCase()}) 🔔\n\n`

    // Adicionar informações de pagamento
    paymentList += `💰 TOTAL A RECEBER: R$ ${totalAReceber.toFixed(2).replace(".", ",")}\n`
    paymentList += `👥 CLIENTES COM PAGAMENTO PENDENTE: ${clientesComPagamento.length}\n\n`

    // Adicionar chave PIX
    if (systemSettings.pixKey) {
      paymentList += `📱 CHAVE PIX PARA PAGAMENTO: ${systemSettings.pixKey}\n`
      paymentList += `📝 FAVORECIDO: ${systemSettings.companyName}\n\n`
    }

    // Adicionar lista de clientes com pagamentos pendentes
    paymentList += `📋 LISTA DE CLIENTES COM PAGAMENTOS PENDENTES:\n\n`

    clientesComPagamento.forEach((entry, index) => {
      const pagamentosPendentes =
        entry.pagamentos?.filter((p) => p.status === "pendente" || p.status === "nao_pago") || []
      const valorTotal = parseValor(entry.valor_cobrado_semanal) * pagamentosPendentes.length

      paymentList += `${index + 1}. ${entry.nome}\n`
      paymentList += `   CPF: ${entry.login_cpf}\n`
      paymentList += `   Valor: R$ ${valorTotal.toFixed(2).replace(".", ",")}\n`
      paymentList += `   Semanas pendentes: ${pagamentosPendentes.length}\n`

      // Adicionar status do perfil
      if (entry.ativo === false) {
        paymentList += `   Status: INATIVO - ${entry.motivoInativacao || "Motivo não informado"}\n`
      }

      if (entry.observacoes) {
        paymentList += `   Obs: ${entry.observacoes.split("\n")[0]}\n`
      }

      paymentList += `\n`
    })

    // Adicionar rodapé
    paymentList += `---------------------------------------------------\n\n`
    paymentList += `✅ APÓS O PAGAMENTO, ATUALIZE O STATUS NO SISTEMA\n`
    paymentList += `📲 ENVIE O COMPROVANTE PARA CONFIRMAÇÃO\n`

    setPaymentListText(paymentList)
  }

  // Copiar para a área de transferência
  const copyToClipboard = () => {
    if (exportTab === "full") {
      if (!summaryText) {
        generateSummary()
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.select()
            document.execCommand("copy")
            toast({
              title: "Copiado!",
              description: "Resumo copiado para a área de transferência.",
              duration: 3000,
            })
          }
        }, 100)
      } else {
        if (textareaRef.current) {
          textareaRef.current.select()
          document.execCommand("copy")
          toast({
            title: "Copiado!",
            description: "Resumo copiado para a área de transferência.",
            duration: 3000,
          })
        }
      }
    } else {
      if (!paymentListText) {
        generatePaymentList()
        setTimeout(() => {
          if (paymentListRef.current) {
            paymentListRef.current.select()
            document.execCommand("copy")
            toast({
              title: "Copiado!",
              description: "Lista de pagamentos copiada para a área de transferência.",
              duration: 3000,
            })
          }
        }, 100)
      } else {
        if (paymentListRef.current) {
          paymentListRef.current.select()
          document.execCommand("copy")
          toast({
            title: "Copiado!",
            description: "Lista de pagamentos copiada para a área de transferência.",
            duration: 3000,
          })
        }
      }
    }
  }

  // Exportar como arquivo .txt
  const exportAsTxt = () => {
    if (exportTab === "full") {
      if (!summaryText) {
        generateSummary()
        setTimeout(() => {
          downloadTxt(summaryText, "resumo_cadastros")
        }, 100)
      } else {
        downloadTxt(summaryText, "resumo_cadastros")
      }
    } else {
      if (!paymentListText) {
        generatePaymentList()
        setTimeout(() => {
          downloadTxt(paymentListText, "lista_pagamentos")
        }, 100)
      } else {
        downloadTxt(paymentListText, "lista_pagamentos")
      }
    }
  }

  // Função auxiliar para download do arquivo .txt
  const downloadTxt = (content: string, filePrefix: string) => {
    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Arquivo exportado",
      description: "O arquivo foi exportado como .txt",
      duration: 3000,
    })
  }

  // Analisar texto para importação
  const parseImportText = () => {
    setImportError(null)
    setImportPreview([])

    if (!importText.trim()) {
      setImportError("O texto de importação está vazio.")
      return
    }

    try {
      // Dividir o texto em seções por cadastro (separados por ---)
      const sections = importText
        .split(/---+/)
        .map((s) => s.trim())
        .filter((s) => s)

      if (sections.length === 0) {
        // Tentar tratar como um único cadastro
        sections.push(importText)
      }

      const parsedEntries: Entry[] = []

      for (const section of sections) {
        // Extrair informações básicas
        const nome = extractValue(section, "NOME:")
        const cpf = extractValue(section, "LOGIN CPF:")
        const senha = extractValue(section, "SENHA:")
        const valorTotal = extractValue(section, "VALOR COBRADO TOTAL:")
        const valorSemanal = extractValue(section, "VALOR COBRADO SEMANAL:")
        const categoria = extractValue(section, "CATEGORIA CARRO:")
        const localRetirada = extractValue(section, "LOCAL RETIRADA:")
        const dataRetirada = extractValue(section, "DATA RETIRADA:")
        const dataDevolucao = extractValue(section, "DATA DEVOLUÇÃO:")
        const dataAposRenovacao = extractValue(section, "DATA APOS RENOVAÇÃO:")
        const cartoesBandeira = extractValue(section, "CARTÕES USADO BANDEIRA:")
        const cartoesNumero = extractValue(section, "FINAL CARTOES USADO NÚMERO:")
        const indicadoPor = extractValue(section, "INDICADO POR:")
        const indicacoes = extractValue(section, "INDICAÇÕES:")

        // Extrair observações (pode estar em múltiplas linhas)
        let observacoes = ""
        const obsMatch = section.match(/OBSERVAÇÕES:\s*\n([\s\S]*?)(\n---+|$)/)
        if (obsMatch && obsMatch[1]) {
          observacoes = obsMatch[1].trim()
        }

        // Verificar campos obrigatórios
        if (!nome || !cpf) {
          throw new Error(`Cadastro incompleto: Nome e CPF são obrigatórios. Seção: ${section.substring(0, 100)}...`)
        }

        // Criar objeto Entry
        const entry: Entry = {
          nome,
          login_cpf: cpf,
          senha: senha || "",
          valor_cobrado_total: valorTotal || "R$ 0,00",
          valor_cobrado_semanal: valorSemanal || "R$ 0,00",
          categoria_carro: categoria || "",
          local_retirada: localRetirada || "",
          data_retirada: dataRetirada || "",
          data_devolucao: dataDevolucao || "",
          data_apos_renovacao: dataAposRenovacao || null,
          cartoes_usado_bandeira: cartoesBandeira ? cartoesBandeira.split(",").map((s) => s.trim()) : [],
          final_cartoes_usado_numero: cartoesNumero ? cartoesNumero.split(",").map((s) => s.trim()) : [],
          observacoes: observacoes || undefined,
        }

        // Adicionar campos opcionais
        if (indicadoPor) {
          entry.indicadoPor = indicadoPor
        }

        if (indicacoes) {
          entry.indicacoes = indicacoes.split(",").map((s) => s.trim())
        }

        // Inicializar pagamentos se não existirem
        if (!entry.pagamentos) {
          const valorSemanalNum = parseValor(entry.valor_cobrado_semanal)
          entry.pagamentos = Array.from({ length: 4 }, (_, i) => ({
            semana: i + 1,
            status: "nao_pago",
            valor: `R$ ${valorSemanalNum.toFixed(2).replace(".", ",")}`,
            data: "",
          }))
        }

        parsedEntries.push(entry)
      }

      if (parsedEntries.length === 0) {
        setImportError("Nenhum cadastro válido encontrado no texto.")
        return
      }

      setImportPreview(parsedEntries)
    } catch (error) {
      console.error("Erro ao analisar texto de importação:", error)
      setImportError(`Erro ao analisar o texto: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Função auxiliar para extrair valores do texto
  const extractValue = (text: string, key: string): string => {
    const regex = new RegExp(`${key}\\s*(.+)`, "i")
    const match = text.match(regex)
    return match ? match[1].trim() : ""
  }

  // Confirmar importação
  const confirmImport = () => {
    if (importPreview.length === 0) {
      toast({
        title: "Nada para importar",
        description: "Nenhum cadastro válido para importar.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setConfirmDialogOpen(true)
  }

  // Executar importação
  const executeImport = () => {
    if (importMode === "replace") {
      // Substituir todos os cadastros
      onImport(importPreview)
      toast({
        title: "Importação concluída",
        description: `${importPreview.length} cadastros importados com sucesso. Cadastros anteriores foram substituídos.`,
        duration: 3000,
      })
    } else {
      // Mesclar com cadastros existentes
      const existingCpfs = new Set(entries.map((e) => e.login_cpf))
      const newEntries = []
      const updatedEntries = []

      for (const entry of importPreview) {
        if (existingCpfs.has(entry.login_cpf)) {
          updatedEntries.push(entry)
        } else {
          newEntries.push(entry)
        }
      }

      // Combinar entradas existentes com novas entradas
      const mergedEntries = entries.map((existing) => {
        const updated = importPreview.find((e) => e.login_cpf === existing.login_cpf)
        return updated || existing
      })

      // Adicionar entradas completamente novas
      const finalEntries = [...mergedEntries, ...importPreview.filter((e) => !existingCpfs.has(e.login_cpf))]

      onImport(finalEntries)

      toast({
        title: "Importação concluída",
        description: `${newEntries.length} novos cadastros e ${updatedEntries.length} atualizações importados com sucesso.`,
        duration: 3000,
      })
    }

    setConfirmDialogOpen(false)
    setImportText("")
    setImportPreview([])
    setActiveTab("export")
  }

  // Gerar resumo ou lista de pagamentos quando as configurações mudam
  useEffect(() => {
    if (exportTab === "full" && !summaryText && entries.length > 0) {
      generateSummary()
    } else if (exportTab === "payment" && !paymentListText && entries.length > 0) {
      generatePaymentList()
    }
  }, [exportTab, systemSettings])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Resumo de Cadastros</CardTitle>
            <CardDescription>Exporte ou importe resumos de cadastros</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Exportar Resumo
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar de Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <Tabs value={exportTab} onValueChange={setExportTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="full" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumo Completo
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Lista de Pagamentos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={exportTab === "full" ? generateSummary : generatePaymentList}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Gerar {exportTab === "full" ? "Resumo" : "Lista"}
              </Button>
              <Button variant="outline" onClick={copyToClipboard} className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
              <Button onClick={exportAsTxt} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar .txt
              </Button>
            </div>

            {exportTab === "full" ? (
              <Textarea
                ref={textareaRef}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                className="font-mono h-[500px] whitespace-pre-wrap"
                placeholder="Clique em 'Gerar Resumo' para visualizar todos os cadastros em formato de texto."
              />
            ) : (
              <Textarea
                ref={paymentListRef}
                value={paymentListText}
                onChange={(e) => setPaymentListText(e.target.value)}
                className="font-mono h-[500px] whitespace-pre-wrap"
                placeholder="Clique em 'Gerar Lista' para criar uma lista de pagamentos para sexta-feira."
              />
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={parseImportText} className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Analisar Texto
              </Button>
              <Button onClick={confirmImport} disabled={importPreview.length === 0} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importar Cadastros
              </Button>
            </div>

            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono h-[300px] whitespace-pre-wrap"
              placeholder="Cole aqui o texto de resumo exportado anteriormente para importar os cadastros."
            />

            {importError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}

            {importPreview.length > 0 && (
              <div className="border rounded-md p-4 space-y-2">
                <h3 className="font-medium">Pré-visualização da Importação</h3>
                <p className="text-sm text-muted-foreground">
                  {importPreview.length} cadastro(s) encontrado(s) no texto.
                </p>
                <ul className="text-sm space-y-1 max-h-[200px] overflow-y-auto">
                  {importPreview.map((entry, index) => (
                    <li key={index} className="border-b pb-1">
                      {entry.nome} ({entry.login_cpf})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Importação</DialogTitle>
              <DialogDescription>
                Você está prestes a importar {importPreview.length} cadastro(s). Como deseja proceder?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="replace"
                  name="importMode"
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                />
                <label htmlFor="replace" className="text-sm font-medium">
                  Substituir todos os cadastros existentes
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="merge"
                  name="importMode"
                  checked={importMode === "merge"}
                  onChange={() => setImportMode("merge")}
                />
                <label htmlFor="merge" className="text-sm font-medium">
                  Mesclar com cadastros existentes (atualiza existentes e adiciona novos)
                </label>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {importMode === "replace"
                    ? "Atenção: Todos os cadastros existentes serão substituídos pelos novos."
                    : "Cadastros com o mesmo CPF serão atualizados e novos cadastros serão adicionados."}
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={executeImport}>Confirmar Importação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
