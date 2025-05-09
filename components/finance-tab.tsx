"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, TrendingUp, Star, Percent, BarChart3 } from "lucide-react"
import type { Entry } from "@/types/entry"
import { Badge } from "@/components/ui/badge"
import { parseValor, formatValor } from "@/utils/finance-utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface FinanceTabProps {
  entries: Entry[]
}

// Função para extrair o mês e ano de uma data no formato DD/MM/YYYY
const extrairMesAno = (dataStr: string): { mes: number; ano: number } | null => {
  if (!dataStr) return null

  const partes = dataStr.split(" ")[0].split("/")
  if (partes.length !== 3) return null

  return {
    mes: Number.parseInt(partes[1]),
    ano: Number.parseInt(partes[2]),
  }
}

// Função para formatar o nome do mês
const formatarNomeMes = (mes: number): string => {
  const nomesMeses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]
  return nomesMeses[mes - 1]
}

export default function FinanceTab({ entries }: FinanceTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("resumo")

  // Adicionar um estado para controlar a semana selecionada
  const [selectedWeek, setSelectedWeek] = useState<number>(1)

  // Calcular resumo financeiro
  const resumoFinanceiro = useMemo(() => {
    // Total de pagamentos recebidos
    let totalRecebido = 0
    let totalDescontos = 0

    // Processar pagamentos
    entries.forEach((entry) => {
      if (entry.pagamentos) {
        entry.pagamentos.forEach((pagamento) => {
          // Converter valor para número
          const valorNumerico = parseValor(pagamento.valor)

          // Considerar apenas pagamentos da semana selecionada
          if (pagamento.status === "pago" && pagamento.semana === selectedWeek) {
            totalRecebido += valorNumerico
          }
        })
      }

      // Adicionar descontos se houver
      if (entry.valorDesconto && entry.descontoAplicado) {
        const valorDesconto = parseValor(entry.valorDesconto)
        totalDescontos += valorDesconto
      }
    })

    // Calcular total líquido
    const totalLiquido = totalRecebido - totalDescontos

    return {
      totalRecebido,
      totalDescontos,
      totalLiquido,
      semanaAtual: selectedWeek,
    }
  }, [entries, selectedWeek])

  // Calcular totais por semana e por mês
  const totaisPorPeriodo = useMemo(() => {
    // Mapear valores por semana
    const totalPorSemana = new Map<number, number>()
    const totalPorMes = new Map<string, number>()

    // Inicializar semanas de 1 a 4
    for (let i = 1; i <= 4; i++) {
      totalPorSemana.set(i, 0)
    }

    // Processar todos os cadastros
    entries.forEach((entry) => {
      // Obter valor semanal
      const valorSemanal = parseValor(entry.valor_cobrado_semanal)

      // Adicionar ao total por semana
      for (let i = 1; i <= 4; i++) {
        totalPorSemana.set(i, (totalPorSemana.get(i) || 0) + valorSemanal)
      }

      // Extrair mês e ano da data de retirada
      const dataInfo = extrairMesAno(entry.data_retirada)
      if (dataInfo) {
        const chave = `${dataInfo.mes}/${dataInfo.ano}`
        const valorTotal = parseValor(entry.valor_cobrado_total)
        totalPorMes.set(chave, (totalPorMes.get(chave) || 0) + valorTotal)
      }
    })

    // Converter para arrays para facilitar a renderização
    const semanas = Array.from(totalPorSemana.entries())
      .map(([semana, valor]) => ({ semana, valor }))
      .sort((a, b) => a.semana - b.semana)

    const meses = Array.from(totalPorMes.entries())
      .map(([chave, valor]) => {
        const [mes, ano] = chave.split("/")
        return {
          chave,
          mes: Number.parseInt(mes),
          ano: Number.parseInt(ano),
          nomeMes: formatarNomeMes(Number.parseInt(mes)),
          valor,
        }
      })
      .sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano
        return a.mes - b.mes
      })

    // Calcular totais
    const totalSemanal = semanas.reduce((acc, curr) => acc + curr.valor, 0) / 4 // Média para evitar contagem duplicada
    const totalMensal = meses.reduce((acc, curr) => acc + curr.valor, 0)

    return {
      semanas,
      meses,
      totalSemanal,
      totalMensal,
    }
  }, [entries])

  // Calcular indicações
  const indicacoes = useMemo(() => {
    const indicadoresMap = new Map<
      string,
      {
        cpf: string
        nome: string
        indicados: Entry[]
        totalDescontos: number
        descontoAplicado: boolean
        valorDesconto: string
      }
    >()

    // Identificar todos os indicadores
    entries.forEach((entry) => {
      // Se o usuário pode indicar, adicioná-lo à lista de indicadores
      if (entry.podeIndicar) {
        if (!indicadoresMap.has(entry.login_cpf)) {
          indicadoresMap.set(entry.login_cpf, {
            cpf: entry.login_cpf,
            nome: entry.nome,
            indicados: [],
            totalDescontos: 0,
            descontoAplicado: !!entry.descontoAplicado,
            valorDesconto: entry.valorDesconto || "R$ 0,00",
          })
        }
      }
    })

    // Adicionar indicados para cada indicador
    entries.forEach((entry) => {
      if (entry.indicadoPor) {
        const indicador = indicadoresMap.get(entry.indicadoPor)
        if (indicador) {
          // Verificar se já foi adicionado
          if (!indicador.indicados.some((i) => i.login_cpf === entry.login_cpf)) {
            indicador.indicados.push(entry)
          }
        }
      }
    })

    // Atualizar informações de desconto para cada indicador
    indicadoresMap.forEach((indicador) => {
      const entry = entries.find((e) => e.login_cpf === indicador.cpf)
      if (entry && entry.valorDesconto) {
        indicador.valorDesconto = entry.valorDesconto
        indicador.totalDescontos = parseValor(entry.valorDesconto)
        indicador.descontoAplicado = !!entry.descontoAplicado
      }
    })

    return Array.from(indicadoresMap.values())
  }, [entries])

  // Filtrar indicações com base na busca
  const indicacoesFiltradas = useMemo(() => {
    if (!searchTerm) return indicacoes

    const searchLower = searchTerm.toLowerCase()
    return indicacoes.filter(
      (indicacao) => indicacao.nome.toLowerCase().includes(searchLower) || indicacao.cpf.includes(searchLower),
    )
  }, [indicacoes, searchTerm])

  // Obter status de pagamento para um cliente
  const getStatusPagamento = (entry: Entry) => {
    if (!entry.pagamentos || entry.pagamentos.length === 0) {
      return { status: "nao_pago", label: "Não iniciado" }
    }

    const totalSemanas = entry.pagamentos.length
    const pagas = entry.pagamentos.filter((p) => p.status === "pago").length
    const pendentes = entry.pagamentos.filter((p) => p.status === "pendente").length

    if (pagas === totalSemanas) {
      return { status: "pago", label: "Pago" }
    } else if (pendentes > 0) {
      return { status: "pendente", label: `${pagas}/${totalSemanas} pagas` }
    } else {
      return { status: "nao_pago", label: `${pagas}/${totalSemanas} pagas` }
    }
  }

  // Clientes com desconto aplicado
  const clientesComDesconto = entries.filter((entry) => entry.descontoAplicado && entry.valorDesconto)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controle Financeiro</CardTitle>
        <CardDescription>Gerencie indicações, descontos e pagamentos</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resumo" value={viewMode} onValueChange={setViewMode}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="resumo" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="total" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total
            </TabsTrigger>
            <TabsTrigger value="indicacoes" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Indicações
            </TabsTrigger>
            <TabsTrigger value="descontos" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Descontos
            </TabsTrigger>
          </TabsList>

          {/* Nova aba de Total */}
          <TabsContent value="resumo" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Selecione a Semana:</h3>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((week) => (
                  <Button
                    key={week}
                    variant={selectedWeek === week ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedWeek(week)}
                  >
                    Semana {week}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Recebido (Semana {resumoFinanceiro.semanaAtual})</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatValor(resumoFinanceiro.totalRecebido)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total de Descontos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                    {formatValor(resumoFinanceiro.totalDescontos)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Líquido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatValor(resumoFinanceiro.totalLiquido)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Clientes com Pagamentos Pendentes</h3>

              <div className="space-y-2">
                {entries
                  .filter((entry) => {
                    const status = getStatusPagamento(entry)
                    return status.status !== "pago"
                  })
                  .map((entry) => {
                    const status = getStatusPagamento(entry)
                    return (
                      <div
                        key={entry.login_cpf}
                        className={`p-3 rounded-md border ${
                          status.status === "pendente" ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{entry.nome}</span>
                            {entry.podeIndicar && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" title="Pode indicar" />
                            )}
                            {entry.descontoAplicado && (
                              <Percent className="h-4 w-4 text-green-500" title="Desconto aplicado" />
                            )}
                          </div>
                          <Badge
                            variant={status.status === "pendente" ? "outline" : "destructive"}
                            className={status.status === "pendente" ? "border-orange-500 text-orange-600" : ""}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex justify-between mt-1 text-sm">
                          <span>CPF: {entry.login_cpf}</span>
                          <span>Valor: {entry.valor_cobrado_total}</span>
                        </div>
                      </div>
                    )
                  })}

                {entries.filter((entry) => {
                  const status = getStatusPagamento(entry)
                  return status.status !== "pago"
                }).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Não há clientes com pagamentos pendentes.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="total" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total por Semana</CardTitle>
                  <CardDescription>Estimativa de ganhos semanais com todos os cadastros</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                      {totaisPorPeriodo.semanas.map((item) => (
                        <div key={item.semana} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <span className="font-medium">Semana {item.semana}</span>
                          <span className="text-green-600 font-medium">{formatValor(item.valor)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total Semanal (média):</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatValor(totaisPorPeriodo.totalSemanal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total por Mês</CardTitle>
                  <CardDescription>Estimativa de ganhos mensais baseado nas datas de retirada</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead>Ano</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {totaisPorPeriodo.meses.map((item) => (
                          <TableRow key={item.chave}>
                            <TableCell className="font-medium">{item.nomeMes}</TableCell>
                            <TableCell>{item.ano}</TableCell>
                            <TableCell className="text-right text-green-600">{formatValor(item.valor)}</TableCell>
                          </TableRow>
                        ))}
                        {totaisPorPeriodo.meses.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                              Nenhum dado mensal disponível
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total Mensal:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatValor(totaisPorPeriodo.totalMensal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo Geral</CardTitle>
                <CardDescription>Visão geral dos ganhos estimados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Total de Cadastros</p>
                    <p className="text-2xl font-bold">{entries.length}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Média por Cadastro</p>
                    <p className="text-2xl font-bold text-green-600">
                      {entries.length > 0 ? formatValor(totaisPorPeriodo.totalMensal / entries.length) : "R$ 0,00"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Projeção Anual</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatValor((totaisPorPeriodo.totalMensal * 12) / Math.max(1, totaisPorPeriodo.meses.length))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="indicacoes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Clientes que podem indicar
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              {indicacoesFiltradas.length === 0 ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-center text-muted-foreground">
                      {searchTerm
                        ? "Nenhum resultado encontrado para sua busca."
                        : "Nenhum cliente pode indicar ainda."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                indicacoesFiltradas.map((indicador) => (
                  <Card key={indicador.cpf}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <CardTitle className="flex items-center gap-1">
                            {indicador.nome} <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {indicador.descontoAplicado && <Percent className="h-4 w-4 text-green-500" />}
                          </CardTitle>
                          <CardDescription>CPF: {indicador.cpf}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {indicador.indicados.length} indicações
                          </Badge>
                          {indicador.descontoAplicado && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Desconto: {indicador.valorDesconto}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="text-sm font-medium mb-2">Pessoas Indicadas:</h4>
                      {indicador.indicados.length > 0 ? (
                        <div className="space-y-2">
                          {indicador.indicados.map((indicado, index) => (
                            <div key={index} className="p-3 bg-muted rounded-md">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{indicado.nome}</p>
                                  <p className="text-sm text-muted-foreground">CPF: {indicado.login_cpf}</p>
                                </div>
                              </div>
                              <div className="flex justify-between mt-2 text-sm">
                                <span>Valor do aluguel: {indicado.valor_cobrado_total}</span>
                                <span>Data: {indicado.data_retirada.split(" ")[0]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Este cliente ainda não indicou ninguém.</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="descontos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Percent className="h-5 w-5 text-green-500" />
                Clientes com Desconto Aplicado
              </h3>
            </div>

            <div className="space-y-4">
              {clientesComDesconto.length === 0 ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-center text-muted-foreground">Nenhum cliente com desconto aplicado.</p>
                  </CardContent>
                </Card>
              ) : (
                clientesComDesconto.map((cliente) => (
                  <Card key={cliente.login_cpf}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-1">
                            {cliente.nome}
                            {cliente.podeIndicar && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                            <Percent className="h-4 w-4 text-green-500" />
                          </CardTitle>
                          <CardDescription>CPF: {cliente.login_cpf}</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Desconto: {cliente.valorDesconto}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Valor Original:</p>
                          <p className="text-sm line-through">{cliente.valorOriginal}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Valor com Desconto:</p>
                          <p className="text-sm text-green-600 font-medium">{cliente.valor_cobrado_total}</p>
                        </div>
                      </div>

                      {cliente.indicacoes && cliente.indicacoes.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium">Indicações feitas ({cliente.indicacoes.length}):</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {cliente.indicacoes.map((cpf, i) => {
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
                        </div>
                      )}

                      <div className="mt-4">
                        <p className="text-sm font-medium">Parcelas Semanais:</p>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {cliente.pagamentos?.map((pagamento) => (
                            <div
                              key={pagamento.semana}
                              className={`p-2 rounded-md text-xs ${
                                pagamento.status === "pago"
                                  ? "bg-green-50 border border-green-200"
                                  : pagamento.status === "pendente"
                                    ? "bg-orange-50 border border-orange-200"
                                    : "bg-red-50 border border-red-200"
                              }`}
                            >
                              <div className="flex justify-between">
                                <span>Semana {pagamento.semana}</span>
                                <span
                                  className={
                                    pagamento.status === "pago"
                                      ? "text-green-600"
                                      : pagamento.status === "pendente"
                                        ? "text-orange-600"
                                        : "text-red-600"
                                  }
                                >
                                  {pagamento.status === "pago"
                                    ? "Pago"
                                    : pagamento.status === "pendente"
                                      ? "Pendente"
                                      : "Não Pago"}
                                </span>
                              </div>
                              <p className="font-medium mt-1">{pagamento.valor}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
