"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Plus,
  UserPlus,
  Trash2,
  Edit,
  Phone,
  Calendar,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Copy,
} from "lucide-react"
import type { PerfilPendente, Entry } from "@/types/entry"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PendingProfilesProps {
  pendingProfiles: PerfilPendente[]
  onAddProfile: (profile: PerfilPendente) => void
  onRemoveProfile: (id: string) => void
  onUpdateProfile: (profile: PerfilPendente) => void
  onConvertToEntry: (profile: PerfilPendente) => void
  entries: Entry[] // Para verificar duplicatas
  setEditingEntry?: (entry: Entry) => void
}

export default function PendingProfiles({
  pendingProfiles,
  onAddProfile,
  onRemoveProfile,
  onUpdateProfile,
  onConvertToEntry,
  entries,
  setEditingEntry,
}: PendingProfilesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<PerfilPendente | null>(null)

  // Estados para o formulário
  const [nome, setNome] = useState("")
  const [contato, setContato] = useState("")
  const [cpf, setCpf] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [status, setStatus] = useState<"pendente" | "em_contato" | "desistiu">("pendente")

  // Estado para o texto de entrada no formato especificado
  const [textInput, setTextInput] = useState("")

  // Novo estado para o diálogo de importação em massa
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false)
  const [bulkImportText, setBulkImportText] = useState("")
  const [parsedProfiles, setParsedProfiles] = useState<Array<{ nome: string; cpf: string; senha: string }>>([])
  const [importError, setImportError] = useState<string | null>(null)

  // Adicionar novos estados para o formulário simplificado e exportação
  const [valorTotal, setValorTotal] = useState("2500.00")
  const [valorSemanal, setValorSemanal] = useState("625.00")
  const [nomeSimples, setNomeSimples] = useState("")
  const [cpfSimples, setCpfSimples] = useState("")
  const [senhaSimples, setSenhaSimples] = useState("")
  const [categoriaSimples, setCategoriaSimples] = useState("")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"padrao" | "checking">("padrao")
  const [exportText, setExportText] = useState("")

  const { toast } = useToast()

  // Filtrar perfis com base na busca
  const filteredProfiles = pendingProfiles.filter((profile) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      profile.nome.toLowerCase().includes(searchLower) ||
      profile.contato.includes(searchLower) ||
      (profile.cpf && profile.cpf.includes(searchLower)) ||
      profile.observacoes.toLowerCase().includes(searchLower)
    )
  })

  // Função para gerar um ID único
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  // Função para formatar a data atual
  const getCurrentDateFormatted = () => {
    const now = new Date()
    const day = now.getDate().toString().padStart(2, "0")
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const year = now.getFullYear()
    const hours = now.getHours().toString().padStart(2, "0")
    const minutes = now.getMinutes().toString().padStart(2, "0")

    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  // Resetar o formulário
  const resetForm = () => {
    setNome("")
    setContato("")
    setCpf("")
    setObservacoes("")
    setStatus("pendente")
  }

  // Abrir diálogo para adicionar perfil
  const openAddDialog = () => {
    setTextInput("")
    setStatus("pendente")
    setAddDialogOpen(true)
  }

  // Abrir diálogo para editar perfil
  const openEditDialog = (profile: PerfilPendente) => {
    setSelectedProfile(profile)
    setNome(profile.nome)
    setContato(profile.contato)
    setCpf(profile.cpf || "")
    setObservacoes(profile.observacoes)
    setStatus(profile.status)
    setEditDialogOpen(true)
  }

  // Abrir diálogo para converter perfil
  const openConvertDialog = (profile: PerfilPendente) => {
    setSelectedProfile(profile)
    setConvertDialogOpen(true)
  }

  // Função para adicionar perfil a partir do texto formatado
  const handleAddProfileFromText = () => {
    if (!textInput.trim()) {
      toast({
        title: "Texto vazio",
        description: "Por favor, preencha os dados do cadastro.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      // Extrair informações do texto
      const valorTotal = extractValue(textInput, "VALOR COBRADO TOTAL:")
      const valorSemanal = extractValue(textInput, "VALOR COBRADO SEMANAL:")
      const nome = extractValue(textInput, "NOME:")
      const cpf = extractValue(textInput, "LOGIN CPF:")
      const senha = extractValue(textInput, "SENHA:")
      const categoria = extractValue(textInput, "CATEGORIA CARRO:")
      const cartoesBandeira = extractValue(textInput, "CARTÕES USADO BANDEIRA:")
      const cartoesNumero = extractValue(textInput, "FINAL CARTOES USADO NÚMERO:")

      // Verificar campos obrigatórios
      if (!nome) {
        toast({
          title: "Campo obrigatório",
          description: "O nome é obrigatório.",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      // Criar observações com os dados financeiros e senha
      const observacoes = `VALOR COBRADO TOTAL: ${valorTotal}
VALOR COBRADO SEMANAL: ${valorSemanal}
SENHA: ${senha}
CATEGORIA CARRO: ${categoria}
CARTÕES USADO BANDEIRA: ${cartoesBandeira}
FINAL CARTOES USADO NÚMERO: ${cartoesNumero}`

      // Criar novo perfil
      const newProfile: PerfilPendente = {
        id: generateId(),
        nome,
        contato: cpf || "Pendente",
        cpf,
        observacoes,
        dataCriacao: getCurrentDateFormatted(),
        status,
      }

      onAddProfile(newProfile)
      setAddDialogOpen(false)
      setTextInput("")
      setStatus("pendente")

      toast({
        title: "Perfil adicionado",
        description: `${nome} foi adicionado à lista de pendentes.`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Erro ao processar texto:", error)
      toast({
        title: "Erro ao processar",
        description: "Não foi possível processar o texto. Verifique o formato.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Função auxiliar para extrair valores do texto
  const extractValue = (text: string, key: string): string => {
    const regex = new RegExp(`${key}\\s*(.+)`, "i")
    const match = text.match(regex)
    return match ? match[1].trim() : ""
  }

  // Adicionar novo perfil
  const handleAddProfile = () => {
    if (!nome || !contato) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e contato são obrigatórios.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    const newProfile: PerfilPendente = {
      id: generateId(),
      nome,
      contato,
      cpf: cpf || undefined,
      observacoes,
      dataCriacao: getCurrentDateFormatted(),
      status,
    }

    onAddProfile(newProfile)
    setAddDialogOpen(false)
    resetForm()

    toast({
      title: "Perfil adicionado",
      description: `${nome} foi adicionado à lista de pendentes.`,
      duration: 3000,
    })
  }

  // Atualizar perfil existente
  const handleUpdateProfile = () => {
    if (!selectedProfile) return

    if (!nome || !contato) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e contato são obrigatórios.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    const updatedProfile: PerfilPendente = {
      ...selectedProfile,
      nome,
      contato,
      cpf: cpf || undefined,
      observacoes,
      status,
    }

    onUpdateProfile(updatedProfile)
    setEditDialogOpen(false)

    toast({
      title: "Perfil atualizado",
      description: `${nome} foi atualizado com sucesso.`,
      duration: 3000,
    })
  }

  // Converter perfil para cadastro completo
  const handleConvertToEntry = () => {
    if (!selectedProfile) return

    onConvertToEntry(selectedProfile)
    setConvertDialogOpen(false)

    toast({
      title: "Perfil convertido",
      description: `${selectedProfile.nome} foi convertido para cadastro completo.`,
      duration: 3000,
    })
  }

  const convertToEntry = (profile: PerfilPendente) => {
    // Extrair informações das observações
    const valorTotal = extractValue(profile.observacoes || "", "VALOR COBRADO TOTAL:")
    const valorSemanal = extractValue(profile.observacoes || "", "VALOR COBRADO SEMANAL:")
    const senha = extractValue(profile.observacoes || "", "SENHA:")
    const categoria = extractValue(profile.observacoes || "", "CATEGORIA CARRO:")
    const cartoesBandeira = extractValue(profile.observacoes || "", "CARTÕES USADO BANDEIRA:")
    const cartoesNumero = extractValue(profile.observacoes || "", "FINAL CARTOES USADO NÚMERO:")

    // Preparar dados básicos para o formulário de cadastro
    const basicEntry: Partial<Entry> = {
      nome: profile.nome,
      login_cpf: profile.cpf || "",
      senha: senha || "",
      valor_cobrado_total: valorTotal ? `R$ ${valorTotal}` : "R$ 0,00",
      valor_cobrado_semanal: valorSemanal ? `R$ ${valorSemanal}` : "R$ 0,00",
      categoria_carro: categoria || "",
      cartoes_usado_bandeira: cartoesBandeira ? [cartoesBandeira] : [],
      final_cartoes_usado_numero: cartoesNumero ? [cartoesNumero] : [],
    }

    // Definir o entry para edição se setEditingEntry for uma função
    if (typeof setEditingEntry === "function") {
      setEditingEntry(basicEntry as Entry)
    }

    // Remover o perfil pendente
    onRemoveProfile(profile.id)

    // Mudar para a aba de adição
    onConvertToEntry(profile)
  }

  // Atualizar a função getStatusColor para usar as novas classes CSS

  // Obter classe de cor com base no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "status-pending"
      case "em_contato":
        return "status-contact"
      case "desistiu":
        return "status-quit"
      default:
        return "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
    }
  }

  // Obter texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case "pendente":
        return "Pendente"
      case "em_contato":
        return "Em Contato"
      case "desistiu":
        return "Desistiu"
      default:
        return status
    }
  }

  // Nova função para abrir o diálogo de importação em massa
  const openBulkImportDialog = () => {
    setBulkImportText("")
    setParsedProfiles([])
    setImportError(null)
    setBulkImportDialogOpen(true)
  }

  // Nova função para analisar o texto de importação em massa
  const parseBulkImportText = () => {
    setImportError(null)
    setParsedProfiles([])

    if (!bulkImportText.trim()) {
      setImportError("O texto está vazio. Cole as informações dos perfis.")
      return
    }

    try {
      // Dividir o texto em linhas
      const lines = bulkImportText.split("\n").filter((line) => line.trim())

      // Padrões para extrair informações
      const namePattern = /NOME:\s*(.+)/i
      const cpfPattern = /LOGIN CPF:\s*(.+)/i
      const senhaPattern = /SENHA:\s*(.+)/i

      const profiles: Array<{ nome: string; cpf: string; senha: string }> = []
      let currentProfile: { nome?: string; cpf?: string; senha?: string } = {}

      // Processar cada linha
      for (const line of lines) {
        const nameMath = line.match(namePattern)
        const cpfMatch = line.match(cpfPattern)
        const senhaMatch = line.match(senhaPattern)

        if (nameMath) {
          // Se encontramos um novo nome e já temos um perfil em processamento, salvar o anterior
          if (currentProfile.nome) {
            if (currentProfile.cpf && currentProfile.senha) {
              profiles.push({
                nome: currentProfile.nome,
                cpf: currentProfile.cpf,
                senha: currentProfile.senha,
              })
            }
            currentProfile = {}
          }
          currentProfile.nome = nameMath[1].trim()
        }

        if (cpfMatch && currentProfile.nome) {
          currentProfile.cpf = cpfMatch[1].trim()
        }

        if (senhaMatch && currentProfile.nome) {
          currentProfile.senha = senhaMatch[1].trim()
        }

        // Se temos um perfil completo, adicionar à lista
        if (currentProfile.nome && currentProfile.cpf && currentProfile.senha) {
          profiles.push({
            nome: currentProfile.nome,
            cpf: currentProfile.cpf,
            senha: currentProfile.senha,
          })
          currentProfile = {}
        }
      }

      // Verificar se ainda temos um perfil em processamento
      if (currentProfile.nome && currentProfile.cpf && currentProfile.senha) {
        profiles.push({
          nome: currentProfile.nome,
          cpf: currentProfile.cpf,
          senha: currentProfile.senha,
        })
      }

      if (profiles.length === 0) {
        setImportError(
          "Não foi possível identificar perfis válidos no texto. Certifique-se de incluir NOME, LOGIN CPF e SENHA para cada perfil.",
        )
        return
      }

      setParsedProfiles(profiles)
    } catch (error) {
      console.error("Erro ao analisar texto:", error)
      setImportError("Ocorreu um erro ao processar o texto. Verifique o formato e tente novamente.")
    }
  }

  // Nova função para importar os perfis analisados
  const importParsedProfiles = () => {
    if (parsedProfiles.length === 0) {
      setImportError("Nenhum perfil válido para importar.")
      return
    }

    // Criar perfis pendentes a partir dos dados analisados
    const newProfiles = parsedProfiles.map((profile) => {
      return {
        id: generateId(),
        nome: profile.nome,
        contato: "Pendente - Informar final do cartão",
        cpf: profile.cpf,
        observacoes: `Senha: ${profile.senha}\nPendente: Solicitar final do cartão`,
        dataCriacao: getCurrentDateFormatted(),
        status: "pendente" as const,
      }
    })

    // Adicionar cada perfil
    newProfiles.forEach((profile) => {
      onAddProfile(profile)
    })

    // Fechar o diálogo e mostrar mensagem de sucesso
    setBulkImportDialogOpen(false)
    toast({
      title: "Perfis importados",
      description: `${newProfiles.length} perfis foram adicionados à lista de pendentes.`,
      duration: 3000,
    })
  }

  // Função para gerar texto de exemplo para importação
  const generateExampleText = () => {
    const exampleText = `NOME: JOÃO DA SILVA
LOGIN CPF: 123.456.789-00
SENHA: Senha123

NOME: MARIA OLIVEIRA
LOGIN CPF: 987.654.321-00
SENHA: Senha456

NOME: PEDRO SANTOS
LOGIN CPF: 111.222.333-44
SENHA: Senha789`

    setBulkImportText(exampleText)
  }

  // Adicionar função para gerar texto de exportação
  const generateExportText = (profile: PerfilPendente, format: "padrao" | "checking") => {
    if (format === "padrao") {
      // Extrair valores das observações
      const valorTotal = extractValue(profile.observacoes || "", "VALOR COBRADO TOTAL:")
      const valorSemanal = extractValue(profile.observacoes || "", "VALOR COBRADO SEMANAL:")
      const senha = extractValue(profile.observacoes || "", "SENHA:")
      const categoria = extractValue(profile.observacoes || "", "CATEGORIA CARRO:")
      const cartoesBandeira = extractValue(profile.observacoes || "", "CARTÕES USADO BANDEIRA:")
      const cartoesNumero = extractValue(profile.observacoes || "", "FINAL CARTOES USADO NÚMERO:")

      return `VALOR COBRADO TOTAL: ${valorTotal || ""}
VALOR COBRADO SEMANAL: ${valorSemanal || ""}
NOME: ${profile.nome}
LOGIN CPF: ${profile.cpf || ""}
SENHA: ${senha || ""}
CATEGORIA CARRO: ${categoria || ""}
CARTÕES USADO BANDEIRA: ${cartoesBandeira || ""}
FINAL CARTOES USADO NÚMERO: ${cartoesNumero || ""}`
    } else {
      // Formato para checking
      const senha = extractValue(profile.observacoes || "", "SENHA:")
      const cartoesBandeira = extractValue(profile.observacoes || "", "CARTÕES USADO BANDEIRA:")
      const cartoesNumero = extractValue(profile.observacoes || "", "FINAL CARTOES USADO NÚMERO:")

      return `SO FAZER CHEKING
NOME: ${profile.nome}
LOGIN CPF: ${profile.cpf || ""}
SENHA: ${senha || ""}
Horario da retirada:
Horario da devolução:
CARTOES: ${cartoesBandeira || ""} ${cartoesNumero || ""}`
    }
  }

  // Adicionar função para abrir diálogo de exportação
  const openExportDialog = (profile: PerfilPendente, format: "padrao" | "checking") => {
    setSelectedProfile(profile)
    setExportFormat(format)
    setExportText(generateExportText(profile, format))
    setExportDialogOpen(true)
  }

  // Adicionar função para copiar texto de exportação
  const copyExportText = () => {
    navigator.clipboard.writeText(exportText)
    toast({
      title: "Texto copiado!",
      description: "O texto foi copiado para a área de transferência.",
      duration: 3000,
    })
  }

  // Adicionar função para adicionar perfil simplificado
  const handleAddSimpleProfile = () => {
    if (!nomeSimples) {
      toast({
        title: "Campo obrigatório",
        description: "O nome é obrigatório.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // Criar texto no formato padrão
    const observacoes = `VALOR COBRADO TOTAL: ${valorTotal}
VALOR COBRADO SEMANAL: ${valorSemanal}
SENHA: ${senhaSimples}
CATEGORIA CARRO: ${categoriaSimples}
CARTÕES USADO BANDEIRA: 
FINAL CARTOES USADO NÚMERO: `

    // Criar novo perfil
    const newProfile: PerfilPendente = {
      id: generateId(),
      nome: nomeSimples,
      contato: cpfSimples || "Pendente",
      cpf: cpfSimples,
      observacoes,
      dataCriacao: getCurrentDateFormatted(),
      status: "pendente",
    }

    onAddProfile(newProfile)
    setAddDialogOpen(false)

    // Limpar campos
    setNomeSimples("")
    setCpfSimples("")
    setSenhaSimples("")
    setCategoriaSimples("")

    toast({
      title: "Perfil adicionado",
      description: `${nomeSimples} foi adicionado à lista de pendentes.`,
      duration: 3000,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Perfis Pendentes</CardTitle>
            <CardDescription>Gerencie potenciais clientes ainda não confirmados</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={openBulkImportDialog} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Importar de Texto
            </Button>
            <Button onClick={openAddDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Perfil
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar perfis pendentes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum resultado encontrado." : "Nenhum perfil pendente cadastrado."}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProfiles.map((profile) => (
                <div key={profile.id} className={`p-4 rounded-md border ${getStatusColor(profile.status)}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                      <h3 className="font-medium text-lg">{profile.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profile.contato}</span>
                      </div>
                      {profile.cpf && <p className="text-sm mt-1">CPF: {profile.cpf}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={getStatusColor(profile.status)}>
                        {getStatusText(profile.status)}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {profile.dataCriacao}
                      </div>
                    </div>
                  </div>

                  {profile.observacoes && (
                    <div className="mt-3 p-2 bg-background rounded-sm">
                      <pre className="text-sm font-mono whitespace-pre-wrap">{profile.observacoes}</pre>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExportDialog(profile, "padrao")}
                      className="h-8 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Exportar Padrão
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExportDialog(profile, "checking")}
                      className="h-8 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Exportar Checking
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(profile)} className="h-8">
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConvertDialog(profile)}
                      className="h-8 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Converter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveProfile(profile.id)}
                      className="h-8 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diálogo para adicionar perfil */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Adicionar Perfil Pendente</DialogTitle>
              <DialogDescription>Adicione informações do cliente</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="simples">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="simples">Formulário Simples</TabsTrigger>
                <TabsTrigger value="avancado">Texto Completo</TabsTrigger>
              </TabsList>

              <TabsContent value="simples" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="valorTotal">Valor Total</Label>
                    <Input
                      id="valorTotal"
                      value={valorTotal}
                      onChange={(e) => setValorTotal(e.target.value)}
                      placeholder="2500.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="valorSemanal">Valor Semanal</Label>
                    <Input
                      id="valorSemanal"
                      value={valorSemanal}
                      onChange={(e) => setValorSemanal(e.target.value)}
                      placeholder="625.00"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nomeSimples">Nome*</Label>
                  <Input
                    id="nomeSimples"
                    value={nomeSimples}
                    onChange={(e) => setNomeSimples(e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cpfSimples">CPF</Label>
                  <Input
                    id="cpfSimples"
                    value={cpfSimples}
                    onChange={(e) => setCpfSimples(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="senhaSimples">Senha</Label>
                  <Input
                    id="senhaSimples"
                    value={senhaSimples}
                    onChange={(e) => setSenhaSimples(e.target.value)}
                    placeholder="Senha"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="categoriaSimples">Categoria Carro</Label>
                  <Input
                    id="categoriaSimples"
                    value={categoriaSimples}
                    onChange={(e) => setCategoriaSimples(e.target.value)}
                    placeholder="Categoria"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_contato">Em Contato</SelectItem>
                      <SelectItem value="desistiu">Desistiu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddSimpleProfile}>Adicionar Perfil</Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="avancado" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="textInput">Dados do Cadastro</Label>
                  <Textarea
                    id="textInput"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`VALOR COBRADO TOTAL: 2500.00
VALOR COBRADO SEMANAL: 625.00
NOME: 
LOGIN CPF: 
SENHA: 
CATEGORIA CARRO: 
CARTÕES USADO BANDEIRA: 
FINAL CARTOES USADO NÚMERO: `}
                    className="font-mono h-64"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_contato">Em Contato</SelectItem>
                      <SelectItem value="desistiu">Desistiu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddProfileFromText}>Adicionar Perfil</Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Diálogo para editar perfil */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil Pendente</DialogTitle>
              <DialogDescription>Atualize as informações do perfil pendente</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome*</Label>
                <Input id="edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-contato">Contato*</Label>
                <Input id="edit-contato" value={contato} onChange={(e) => setContato(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-cpf">CPF (opcional)</Label>
                <Input id="edit-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_contato">Em Contato</SelectItem>
                    <SelectItem value="desistiu">Desistiu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-observacoes">Observações</Label>
                <Textarea
                  id="edit-observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateProfile}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo para converter perfil */}
        <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Converter para Cadastro</DialogTitle>
              <DialogDescription>Converter este perfil pendente para um cadastro completo?</DialogDescription>
            </DialogHeader>

            {selectedProfile && (
              <div className="py-4">
                <div className="p-4 rounded-md bg-muted mb-4">
                  <h3 className="font-medium">{selectedProfile.nome}</h3>
                  <p className="text-sm mt-1">Contato: {selectedProfile.contato}</p>
                  {selectedProfile.cpf && <p className="text-sm mt-1">CPF: {selectedProfile.cpf}</p>}
                </div>

                <p className="text-sm text-muted-foreground">
                  Ao converter, você será redirecionado para o formulário de cadastro com as informações básicas
                  preenchidas.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={convertToEntry} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Converter para Cadastro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Novo diálogo para importação em massa */}
        <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Importar Perfis de Texto</DialogTitle>
              <DialogDescription>
                Cole o texto com informações de nome, CPF e senha para importar múltiplos perfis pendentes
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bulk-import-text">Texto com Informações</Label>
                  <Button type="button" variant="outline" size="sm" onClick={generateExampleText}>
                    Exemplo
                  </Button>
                </div>
                <Textarea
                  id="bulk-import-text"
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder="Cole aqui o texto com as informações no formato:
NOME: Nome Completo
LOGIN CPF: 123.456.789-00
SENHA: Senha123

NOME: Outro Nome
..."
                  className="font-mono h-64"
                />
                <p className="text-xs text-muted-foreground">
                  O sistema irá extrair nome, CPF e senha de cada perfil. Cada perfil deve ter essas três informações.
                </p>
              </div>

              <Button onClick={parseBulkImportText} className="w-full">
                Analisar Texto
              </Button>

              {importError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{importError}</AlertDescription>
                </Alert>
              )}

              {parsedProfiles.length > 0 && (
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Perfis Encontrados ({parsedProfiles.length})</h3>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2">Nome</th>
                          <th className="text-left py-2">CPF</th>
                          <th className="text-left py-2">Senha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedProfiles.map((profile, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{profile.nome}</td>
                            <td className="py-2">{profile.cpf}</td>
                            <td className="py-2">{profile.senha}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Alert className="mt-4 bg-blue-50 border-blue-200 text-blue-800">
                    <AlertDescription>
                      Estes perfis serão adicionados como pendentes. Você precisará solicitar o final do cartão para
                      cada um.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkImportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={importParsedProfiles} disabled={parsedProfiles.length === 0} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Importar {parsedProfiles.length} Perfis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Novo diálogo para exportação */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Exportar Perfil</DialogTitle>
              <DialogDescription>Copie o texto formatado para usar em outras ferramentas.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="export-text">Texto para Exportação</Label>
                <Textarea id="export-text" value={exportText} readOnly className="font-mono h-48" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={copyExportText} className="gap-2">
                <Copy className="h-4 w-4" />
                Copiar Texto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
