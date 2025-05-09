"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import EntryForm from "@/components/entry-form"
import EntryList from "@/components/entry-list"
import type { Entry, PerfilPendente } from "@/types/entry"
import { UserPlus, Users, Calculator, Clock, FileText, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import FinanceTab from "@/components/finance-tab"
import PendingProfiles from "@/components/pending-profiles"
import { aplicarDesconto, calcularValorDesconto } from "@/utils/finance-utils"
import ExportSummary from "@/components/export-summary"
import SystemSettings, { type SystemSettings as SystemSettingsType } from "@/components/system-settings"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

// Chaves para armazenar os dados no localStorage
const STORAGE_KEY = "cadastro-entries"
const PENDING_PROFILES_KEY = "cadastro-pending-profiles"

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [pendingProfiles, setPendingProfiles] = useState<PerfilPendente[]>([])
  const [activeTab, setActiveTab] = useState("view")
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [systemSettings, setSystemSettings] = useState<SystemSettingsType>({
    pixKey: "",
    paymentDay: "Sexta-feira",
    companyName: "Minha Empresa",
  })
  const { toast } = useToast()

  // Carregar dados do localStorage quando o componente é montado
  useEffect(() => {
    const savedEntries = localStorage.getItem(STORAGE_KEY)
    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries))
        toast({
          title: "Dados carregados",
          description: `${JSON.parse(savedEntries).length} cadastros recuperados do armazenamento local.`,
          duration: 3000,
        })
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível recuperar os cadastros salvos.",
          variant: "destructive",
          duration: 3000,
        })
      }
    }

    // Carregar perfis pendentes
    const savedPendingProfiles = localStorage.getItem(PENDING_PROFILES_KEY)
    if (savedPendingProfiles) {
      try {
        setPendingProfiles(JSON.parse(savedPendingProfiles))
      } catch (error) {
        console.error("Erro ao carregar perfis pendentes:", error)
      }
    }
  }, [])

  // Salvar dados no localStorage sempre que entries mudar
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    }
  }, [entries])

  // Salvar perfis pendentes no localStorage
  useEffect(() => {
    if (pendingProfiles.length > 0) {
      localStorage.setItem(PENDING_PROFILES_KEY, JSON.stringify(pendingProfiles))
    } else {
      localStorage.removeItem(PENDING_PROFILES_KEY)
    }
  }, [pendingProfiles])

  // Quando um entry é selecionado para edição, mudar para a aba de adição
  useEffect(() => {
    if (editingEntry) {
      setActiveTab("add")
    }
  }, [editingEntry])

  const addEntry = (entry: Entry) => {
    // Verificar se é uma atualização de um entry existente
    const existingIndex = entries.findIndex((e) => e.login_cpf === entry.login_cpf)

    if (existingIndex >= 0) {
      // Atualizar entry existente
      const newEntries = [...entries]
      newEntries[existingIndex] = entry
      setEntries(newEntries)

      toast({
        title: "Cadastro atualizado",
        description: `${entry.nome} foi atualizado com sucesso.`,
        duration: 3000,
      })
    } else {
      // Adicionar novo entry
      const newEntries = [...entries, entry]
      setEntries(newEntries)

      toast({
        title: "Cadastro adicionado",
        description: `${entry.nome} foi adicionado com sucesso.`,
        duration: 3000,
      })
    }
  }

  // Função para processar indicações e aplicar descontos
  const processarIndicacao = (indicadorCPF: string, indicadoCPF: string) => {
    // Encontrar o indicador
    const indicadorIndex = entries.findIndex((e) => e.login_cpf === indicadorCPF)
    if (indicadorIndex < 0) return

    // Obter o indicador
    const indicador = entries[indicadorIndex]

    // Verificar se esta indicação já foi processada
    if (indicador.indicacoes && indicador.indicacoes.includes(indicadoCPF)) {
      return // Evitar processamento duplicado
    }

    // Encontrar o indicado
    const indicadoIndex = entries.findIndex((e) => e.login_cpf === indicadoCPF)
    if (indicadoIndex < 0) return

    // Obter o indicado
    const indicado = entries[indicadoIndex]

    // Atualizar a lista de indicações do indicador
    const indicacoes = [...(indicador.indicacoes || []), indicadoCPF]

    // Calcular o valor do desconto com base no número de indicações anteriores
    const indicacoesAnteriores = indicador.indicacoes?.length || 0
    const valorDesconto = calcularValorDesconto(indicacoesAnteriores)

    // Aplicar o desconto ao indicador
    const indicadorAtualizado = aplicarDesconto(
      {
        ...indicador,
        indicacoes,
      },
      valorDesconto,
    )

    // Atualizar o indicado para registrar quem o indicou
    const indicadoAtualizado = {
      ...indicado,
      indicadoPor: indicadorCPF,
    }

    // Atualizar ambos na lista de entries
    const newEntries = [...entries]
    newEntries[indicadorIndex] = indicadorAtualizado
    newEntries[indicadoIndex] = indicadoAtualizado
    setEntries(newEntries)

    // Notificar sobre o desconto aplicado
    toast({
      title: "Desconto aplicado",
      description: `${indicador.nome} recebeu um desconto de ${valorDesconto} por indicar ${indicado.nome}.`,
      duration: 3000,
    })
  }

  const removeEntry = (index: number) => {
    const newEntries = [...entries]
    const removedEntry = newEntries[index]
    newEntries.splice(index, 1)
    setEntries(newEntries)

    // Se remover todos os cadastros, limpar o localStorage
    if (newEntries.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    }

    toast({
      title: "Cadastro removido",
      description: `${removedEntry.nome} foi removido com sucesso.`,
      duration: 3000,
    })
  }

  // Função para atualizar um cadastro existente
  const updateEntry = (index: number, updatedEntry: Entry) => {
    const newEntries = [...entries]
    newEntries[index] = updatedEntry
    setEntries(newEntries)

    // Salvar no localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries))
  }

  // Função para editar um cadastro
  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry)
  }

  // Funções para gerenciar perfis pendentes
  const addPendingProfile = (profile: PerfilPendente) => {
    setPendingProfiles([...pendingProfiles, profile])
  }

  const removePendingProfile = (id: string) => {
    const newProfiles = pendingProfiles.filter((profile) => profile.id !== id)
    setPendingProfiles(newProfiles)

    toast({
      title: "Perfil removido",
      description: "O perfil pendente foi removido com sucesso.",
      duration: 3000,
    })
  }

  const updatePendingProfile = (updatedProfile: PerfilPendente) => {
    const newProfiles = pendingProfiles.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile))
    setPendingProfiles(newProfiles)
  }

  const convertToEntry = (profile: PerfilPendente) => {
    // Preparar dados básicos para o formulário de cadastro
    const basicEntry: Partial<Entry> = {
      nome: profile.nome,
      login_cpf: profile.cpf || "",
    }

    // Definir o entry para edição
    setEditingEntry(basicEntry as Entry)

    // Remover o perfil pendente
    removePendingProfile(profile.id)

    // Mudar para a aba de adição
    setActiveTab("add")
  }

  // Função para exportar dados para um arquivo JSON
  const exportData = () => {
    if (entries.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Adicione cadastros antes de exportar.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    const dataStr = JSON.stringify(entries, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `cadastros_${new Date().toISOString().slice(0, 10)}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    toast({
      title: "Dados exportados",
      description: `${entries.length} cadastros exportados com sucesso.`,
      duration: 3000,
    })
  }

  // Função para importar dados de um arquivo JSON
  const importData = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"

    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string)

          if (Array.isArray(importedData)) {
            setEntries(importedData)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(importedData))
            toast({
              title: "Dados importados",
              description: `${importedData.length} cadastros importados com sucesso.`,
              duration: 3000,
            })
          } else {
            throw new Error("Formato inválido")
          }
        } catch (error) {
          toast({
            title: "Erro ao importar",
            description: "O arquivo selecionado não contém dados válidos.",
            variant: "destructive",
            duration: 3000,
          })
        }
      }
      reader.readAsText(file)
    }

    input.click()
  }

  // Função para fazer backup manual dos dados
  const saveManually = () => {
    if (entries.length === 0) {
      toast({
        title: "Nenhum dado para salvar",
        description: "Adicione cadastros antes de salvar.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    toast({
      title: "Dados salvos",
      description: `${entries.length} cadastros salvos no armazenamento local.`,
      duration: 3000,
    })
  }

  // Adicionar event listener para mudar a aba
  useEffect(() => {
    const handleChangeTab = (event: any) => {
      if (event.detail && event.detail.tab) {
        setActiveTab(event.detail.tab)
      }
    }

    window.addEventListener("changeTab", handleChangeTab)

    return () => {
      window.removeEventListener("changeTab", handleChangeTab)
    }
  }, [])

  // Função para importar cadastros do resumo
  const importFromSummary = (importedEntries: Entry[]) => {
    setEntries(importedEntries)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(importedEntries))

    toast({
      title: "Importação concluída",
      description: `${importedEntries.length} cadastros importados com sucesso.`,
      duration: 3000,
    })
  }

  // Função para atualizar as configurações do sistema
  const handleSettingsChange = (newSettings: SystemSettingsType) => {
    setSystemSettings(newSettings)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSave={saveManually} onExport={exportData} onImport={importData} entriesCount={entries.length} />
      <main className="flex-1 container py-6">
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="add"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {editingEntry ? "Editar Cadastro" : "Novo Cadastro"}
                </TabsTrigger>
                <TabsTrigger
                  value="view"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Cadastros
                  {entries.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {entries.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Pendentes
                  {pendingProfiles.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {pendingProfiles.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="finance"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Finanças
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Resumo
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="add" className="mt-0">
                  <EntryForm
                    onSubmit={addEntry}
                    entries={entries}
                    editingEntry={editingEntry}
                    setEditingEntry={setEditingEntry}
                  />
                </TabsContent>

                <TabsContent value="view" className="mt-0">
                  <EntryList
                    entries={entries}
                    onRemove={removeEntry}
                    onUpdate={updateEntry}
                    onEdit={handleEditEntry}
                    onIndicacao={processarIndicacao}
                  />
                </TabsContent>

                <TabsContent value="pending" className="mt-0">
                  <PendingProfiles
                    pendingProfiles={pendingProfiles}
                    onAddProfile={addPendingProfile}
                    onRemoveProfile={removePendingProfile}
                    onUpdateProfile={updatePendingProfile}
                    onConvertToEntry={convertToEntry}
                    entries={entries}
                    setEditingEntry={setEditingEntry}
                  />
                </TabsContent>

                <TabsContent value="finance" className="mt-0">
                  <FinanceTab entries={entries} />
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                  <ExportSummary entries={entries} onImport={importFromSummary} systemSettings={systemSettings} />
                </TabsContent>

                <TabsContent value="settings" className="mt-0">
                  <SystemSettings onSettingsChange={handleSettingsChange} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
