"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Entry } from "@/types/entry"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { initializePayments } from "@/utils/payment-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EntryFormProps {
  onSubmit: (entry: Entry) => void
  entries: Entry[] // Lista de cadastros existentes para selecionar indicadores
  editingEntry?: Entry | null // Entry sendo editado (opcional)
  setEditingEntry?: (entry: Entry | null) => void // Função para limpar o entry em edição
}

export default function EntryForm({ onSubmit, entries, editingEntry, setEditingEntry }: EntryFormProps) {
  const [textInput, setTextInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [podeIndicar, setPodeIndicar] = useState(false)
  const [observacoes, setObservacoes] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Novos estados para o status do perfil
  const [ativo, setAtivo] = useState(true)
  const [motivoInativacao, setMotivoInativacao] = useState("")

  // Atualizar o formulário quando um entry for selecionado para edição
  useEffect(() => {
    if (editingEntry) {
      setIsEditing(true)

      // Converter o entry para formato de texto
      const entryText = entryToText(editingEntry)
      setTextInput(entryText)

      // Definir podeIndicar
      setPodeIndicar(editingEntry.podeIndicar || false)

      // Definir observações
      setObservacoes(editingEntry.observacoes || "")

      // Definir status do perfil
      setAtivo(editingEntry.ativo !== false) // Se não estiver definido, assume true
      setMotivoInativacao(editingEntry.motivoInativacao || "")
    } else {
      setIsEditing(false)
      setObservacoes("")
      setAtivo(true)
      setMotivoInativacao("")
    }
  }, [editingEntry])

  // Função para converter um entry em texto formatado
  const entryToText = (entry: Entry): string => {
    const lines = [
      `VALOR COBRADO TOTAL: ${entry.valor_cobrado_total}`,
      `VALOR COBRADO SEMANAL: ${entry.valor_cobrado_semanal}`,
      `NOME: ${entry.nome}`,
      `LOGIN CPF: ${entry.login_cpf}`,
      `SENHA: ${entry.senha}`,
      `CATEGORIA CARRO: ${entry.categoria_carro || ""}`,
      `LOCAL RETIRADA: ${entry.local_retirada}`,
      `DATA RETIRADA: ${entry.data_retirada}`,
      `DATA DEVOLUÇÃO: ${entry.data_devolucao}`,
      `DATA APOS RENOVAÇÃO: ${entry.data_apos_renovacao || "----"}`,
      `CARTÕES USADO BANDEIRA: ${entry.cartoes_usado_bandeira?.join(", ") || ""}`,
      `FINAL CARTOES USADO NÚMERO: ${entry.final_cartoes_usado_numero?.join(", ") || ""}`,
    ]

    return lines.join("\n")
  }

  // Modificar a função parseTextToEntry para usar a nova lógica de pagamentos
  const parseTextToEntry = (text: string): Entry | null => {
    try {
      const lines = text.split("\n").filter((line) => line.trim() !== "")
      const entry: Partial<Entry> = {}

      // Se estamos editando, manter os campos que não são editáveis
      if (isEditing && editingEntry) {
        entry.historicoRenovacoes = editingEntry.historicoRenovacoes
        entry.pagamentos = editingEntry.pagamentos
        entry.indicacoes = editingEntry.indicacoes
        entry.descontoAplicado = editingEntry.descontoAplicado
        entry.valorDesconto = editingEntry.valorDesconto
        entry.valorOriginal = editingEntry.valorOriginal
        entry.indicadoPor = editingEntry.indicadoPor
      }

      // Mapeamento de chaves do texto para propriedades do objeto Entry
      const keyMapping: Record<string, keyof Entry> = {
        "VALOR COBRADO TOTAL": "valor_cobrado_total",
        "VALOR COBRADO SEMANAL": "valor_cobrado_semanal",
        NOME: "nome",
        "LOGIN CPF": "login_cpf",
        SENHA: "senha",
        "CATEGORIA CARRO": "categoria_carro",
        "LOCAL RETIRADA": "local_retirada",
        "DATA RETIRADA": "data_retirada",
        "DATA DEVOLUÇÃO": "data_devolucao",
        "DATA APOS RENOVAÇÃO": "data_apos_renovacao",
        "CARTÕES USADO BANDEIRA": "cartoes_usado_bandeira",
        "FINAL CARTOES USADO NÚMERO": "final_cartoes_usado_numero",
      }

      for (const line of lines) {
        // Encontra o primeiro separador (: ou =)
        const separatorIndex = line.indexOf(":")
        if (separatorIndex === -1) continue

        const key = line.substring(0, separatorIndex).trim()
        const value = line.substring(separatorIndex + 1).trim()

        // Encontra a chave correspondente no mapeamento
        const entryKey = Object.keys(keyMapping).find(
          (k) => key.toUpperCase().includes(k) || k.includes(key.toUpperCase()),
        )

        if (entryKey && keyMapping[entryKey]) {
          const propKey = keyMapping[entryKey]

          // Tratamento especial para arrays
          if (propKey === "cartoes_usado_bandeira" || propKey === "final_cartoes_usado_numero") {
            if (value === "----" || value === "") {
              entry[propKey] = []
            } else {
              entry[propKey] = value.split(",").map((item) => item.trim())
            }
          }
          // Tratamento para data_apos_renovacao
          else if (propKey === "data_apos_renovacao") {
            entry[propKey] = value === "----" ? null : value
          }
          // Tratamento para outros campos
          else {
            entry[propKey] = value === "----" ? "" : value
          }
        }
      }

      // Verifica se os campos obrigatórios estão presentes
      if (!entry.nome || !entry.login_cpf) {
        throw new Error("Os campos NOME e LOGIN CPF são obrigatórios")
      }

      // Preenche campos vazios com valores padrão
      if (!entry.categoria_carro) entry.categoria_carro = ""
      if (!entry.cartoes_usado_bandeira) entry.cartoes_usado_bandeira = []
      if (!entry.final_cartoes_usado_numero) entry.final_cartoes_usado_numero = []

      // Inicializar pagamentos semanais se não existirem ou se estamos criando um novo entry
      if (!entry.pagamentos || !isEditing) {
        entry.pagamentos = initializePayments(entry as Entry)
      }

      // Adiciona a permissão de indicação
      entry.podeIndicar = podeIndicar

      // Adiciona as observações
      entry.observacoes = observacoes

      // Adiciona o status do perfil
      entry.ativo = ativo
      entry.motivoInativacao = !ativo ? motivoInativacao : undefined

      // Inicializar lista de indicações se não existir
      if (!entry.indicacoes) {
        entry.indicacoes = []
      }

      return entry as Entry
    } catch (error) {
      console.error("Erro ao analisar texto:", error)
      return null
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedEntry = parseTextToEntry(textInput)

    if (parsedEntry) {
      // Adicionar ou atualizar o cliente
      onSubmit(parsedEntry)

      // Limpar o formulário
      setTextInput("")
      setPodeIndicar(false)
      setObservacoes("")
      setAtivo(true)
      setMotivoInativacao("")

      // Se estávamos editando, limpar o entry em edição
      if (isEditing && setEditingEntry) {
        setEditingEntry(null)
      }

      // Mudar para a aba de visualização para ver o novo cadastro
      if (!isEditing) {
        // Não podemos chamar setActiveTab diretamente aqui, então vamos usar um evento personalizado
        const event = new CustomEvent("changeTab", { detail: { tab: "view" } })
        window.dispatchEvent(event)
      }
    } else {
      setError("Não foi possível processar o texto. Verifique o formato e tente novamente.")
    }
  }

  const handleCancel = () => {
    if (isEditing && setEditingEntry) {
      setEditingEntry(null)
    }
    setTextInput("")
    setPodeIndicar(false)
    setObservacoes("")
    setAtivo(true)
    setMotivoInativacao("")
  }

  const handlePasteExample = () => {
    setTextInput(`VALOR COBRADO TOTAL:  R$ 2.500,00
VALOR COBRADO SEMANAL: R$ 625,00
NOME: LUCAS VIANA
LOGIN CPF: 164.260.837-80
SENHA: @Lc260808
CATEGORIA CARRO: 
LOCAL RETIRADA: NOVA IGUAÇU
DATA RETIRADA: 19/02/2025 10:30
DATA DEVOLUÇÃO: 22/03/2025 10:30
DATA APOS RENOVAÇÃO: ----
CARTÕES USADO BANDEIRA: VISA, MASTER, AMEX
FINAL CARTOES USADO NÚMERO: V3137, M5427, AX913`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Cadastro" : "Adicionar Novo Cadastro"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Edite os dados do cadastro no formato de texto"
            : "Insira os dados do cadastro no formato de texto"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="status">Status do Perfil</TabsTrigger>
            <TabsTrigger value="options">Opções Adicionais</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="textInput">Dados do Cadastro</Label>
                  {!isEditing && (
                    <Button type="button" variant="outline" size="sm" onClick={handlePasteExample}>
                      Colar Exemplo
                    </Button>
                  )}
                </div>
                <Textarea
                  id="textInput"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`VALOR COBRADO TOTAL: R$ 0,00
VALOR COBRADO SEMANAL: R$ 0,00
NOME: 
LOGIN CPF: 
SENHA: 
CATEGORIA CARRO: 
LOCAL RETIRADA: 
DATA RETIRADA: 
DATA DEVOLUÇÃO: 
DATA APOS RENOVAÇÃO: 
CARTÕES USADO BANDEIRA: 
FINAL CARTOES USADO NÚMERO: `}
                  className="font-mono h-64"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre este cliente (opcional)"
                  className="h-24"
                />
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-medium">Status do Perfil</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
                  <Label htmlFor="ativo">Este cliente está ativo</Label>
                </div>

                {!ativo && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="motivoInativacao">Motivo da Inativação</Label>
                    <Textarea
                      id="motivoInativacao"
                      value={motivoInativacao}
                      onChange={(e) => setMotivoInativacao(e.target.value)}
                      placeholder="Explique o motivo da inativação deste cliente"
                      className="h-24"
                    />
                  </div>
                )}

                <div className="bg-muted p-3 rounded-md mt-2">
                  <p className="text-sm text-muted-foreground">
                    Clientes inativos permanecem no sistema, mas são visualmente marcados como inativos e podem ser
                    filtrados separadamente.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-medium">Permissão de Indicação</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="podeIndicar" checked={podeIndicar} onCheckedChange={setPodeIndicar} />
                  <Label htmlFor="podeIndicar">Este cliente pode indicar outros (receberá uma estrela ⭐)</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Clientes com estrela podem indicar outros clientes diretamente do seu perfil.
                </p>
              </div>
            </TabsContent>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit">{isEditing ? "Salvar Alterações" : "Adicionar Cadastro"}</Button>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  )
}
