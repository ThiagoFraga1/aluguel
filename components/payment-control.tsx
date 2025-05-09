"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Check, Clock, X, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Entry, PagamentoSemanal } from "@/types/entry"
import { getNextPaymentDate } from "@/utils/payment-utils"

interface PaymentControlProps {
  entry: Entry
  onUpdate: (updatedEntry: Entry) => void
}

export default function PaymentControl({ entry, onUpdate }: PaymentControlProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PagamentoSemanal | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [valor, setValor] = useState("")
  const [status, setStatus] = useState<"pago" | "pendente" | "nao_pago">("pendente")
  const [observacao, setObservacao] = useState("")
  const [nextPendingWeek, setNextPendingWeek] = useState<number | null>(null)

  // Inicializar pagamentos se não existirem
  const pagamentos = entry.pagamentos || []

  // Encontrar a próxima semana pendente
  useEffect(() => {
    const findNextPendingWeek = () => {
      // Primeiro procurar por semanas com status "pendente"
      const pendingWeek = pagamentos.find((p) => p.status === "pendente")
      if (pendingWeek) {
        return pendingWeek.semana
      }

      // Se não encontrar pendente, procurar por "nao_pago"
      const unpaidWeek = pagamentos.find((p) => p.status === "nao_pago")
      if (unpaidWeek) {
        return unpaidWeek.semana
      }

      return null
    }

    setNextPendingWeek(findNextPendingWeek())
  }, [pagamentos])

  const handleEditPayment = (payment: PagamentoSemanal) => {
    // Verificar se o pagamento já está marcado como pago (fechado)
    if (payment.status === "pago") {
      // Mostrar mensagem informativa que pagamentos já realizados não podem ser editados
      return
    }

    setSelectedPayment(payment)
    setStatus(payment.status)
    setValor(payment.valor)
    setObservacao(payment.observacao || "")

    if (payment.data) {
      const dateParts = payment.data.split("/")
      if (dateParts.length === 3) {
        const day = Number.parseInt(dateParts[0])
        const month = Number.parseInt(dateParts[1]) - 1
        const year = Number.parseInt(dateParts[2])
        setDate(new Date(year, month, day))
      } else {
        setDate(undefined)
      }
    } else {
      setDate(undefined)
    }

    setEditDialogOpen(true)
  }

  const handleSavePayment = () => {
    if (!selectedPayment) return

    const formattedDate = date ? format(date, "dd/MM/yyyy") : getNextPaymentDate()

    const updatedPayment: PagamentoSemanal = {
      ...selectedPayment,
      status,
      valor,
      data: formattedDate,
      observacao,
    }

    const updatedPayments = pagamentos.map((p) => (p.semana === selectedPayment.semana ? updatedPayment : p))

    const updatedEntry: Entry = {
      ...entry,
      pagamentos: updatedPayments,
    }

    onUpdate(updatedEntry)
    setEditDialogOpen(false)

    // Se o status foi alterado para "pago", encontrar a próxima semana pendente
    if (status === "pago") {
      const nextPending = updatedPayments.filter((p) => p.status !== "pago").sort((a, b) => a.semana - b.semana)[0]

      if (nextPending) {
        // Abrir automaticamente o diálogo para a próxima semana pendente
        setTimeout(() => {
          handleEditPayment(nextPending)
        }, 500)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="payment-paid">Pago</Badge>
      case "pendente":
        return <Badge className="payment-pending">Pendente</Badge>
      case "nao_pago":
        return <Badge className="payment-unpaid">Não Pago</Badge>
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pago":
        return <Lock className="h-4 w-4 text-green-500 dark:text-green-400" />
      case "pendente":
        return <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
      case "nao_pago":
        return <X className="h-4 w-4 text-red-500 dark:text-red-400" />
      default:
        return null
    }
  }

  const getPaymentCardClass = (status: string, isNextPending: boolean) => {
    let baseClass = ""

    switch (status) {
      case "pago":
        baseClass = "payment-paid"
        break
      case "pendente":
        baseClass = "payment-pending"
        break
      case "nao_pago":
        baseClass = "payment-unpaid"
        break
      default:
        baseClass = ""
    }

    // Adicionar destaque para a próxima semana pendente
    if (isNextPending) {
      baseClass += " ring-2 ring-offset-2 ring-blue-500"
    }

    return baseClass
  }

  // Ordenar pagamentos por semana
  const sortedPayments = [...pagamentos].sort((a, b) => a.semana - b.semana)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Controle de Pagamentos Semanais</h3>
      <p className="text-sm text-muted-foreground">
        Os pagamentos são realizados às sextas-feiras. Clientes que fazem a retirada na sexta-feira pagam na próxima
        semana.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedPayments.map((payment) => {
          const isPaid = payment.status === "pago"
          const isNextPending = payment.semana === nextPendingWeek

          return (
            <div
              key={payment.semana}
              className={cn(
                "p-4 rounded-md border transition-all",
                getPaymentCardClass(payment.status, isNextPending),
                isPaid ? "opacity-80" : "cursor-pointer hover:bg-accent/50",
              )}
              onClick={() => !isPaid && handleEditPayment(payment)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium flex items-center gap-1">
                    Semana {payment.semana}
                    {isPaid && <Lock className="h-3 w-3 text-green-600" title="Pagamento fechado" />}
                    {isNextPending && !isPaid && (
                      <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Próximo
                      </Badge>
                    )}
                  </h4>
                  <p className="text-sm">Valor: {payment.valor}</p>
                </div>
                {getStatusBadge(payment.status)}
              </div>

              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(payment.status)}
                <span>{payment.data ? `Data: ${payment.data}` : "Data não definida"}</span>
              </div>

              {payment.observacao && <p className="text-xs mt-2 italic">{payment.observacao}</p>}

              {isPaid ? (
                <p className="text-xs mt-2 text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Pagamento confirmado e fechado
                </p>
              ) : isNextPending ? (
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditPayment(payment)
                  }}
                >
                  Registrar Pagamento
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Pagamento</DialogTitle>
            <DialogDescription>Semana {selectedPayment?.semana} - Atualizar status e informações</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <div className="col-span-3 flex gap-2">
                <Button
                  type="button"
                  variant={status === "pago" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus("pago")}
                  className={
                    status === "pago" ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700" : ""
                  }
                >
                  <Check className="mr-1 h-4 w-4" />
                  Pago
                </Button>
                <Button
                  type="button"
                  variant={status === "pendente" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus("pendente")}
                  className={
                    status === "pendente"
                      ? "bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700"
                      : ""
                  }
                >
                  <Clock className="mr-1 h-4 w-4" />
                  Pendente
                </Button>
                <Button
                  type="button"
                  variant={status === "nao_pago" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus("nao_pago")}
                  className={
                    status === "nao_pago" ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700" : ""
                  }
                >
                  <X className="mr-1 h-4 w-4" />
                  Não Pago
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valor" className="text-right">
                Valor
              </Label>
              <Input id="valor" value={valor} onChange={(e) => setValor(e.target.value)} className="col-span-3" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Data
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn("col-span-3 justify-start text-left font-normal", !date && "text-muted-foreground")}
                    onClick={() => {}}
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="observacao" className="text-right pt-2">
                Observação
              </Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="col-span-3"
                rows={3}
              />
            </div>

            {status === "pago" && (
              <div className="bg-green-50 p-3 rounded-md text-green-700 text-sm">
                <p className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <strong>Atenção:</strong> Ao marcar como pago, este pagamento será fechado e não poderá ser editado
                  posteriormente.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSavePayment}>
              {status === "pago" ? "Confirmar e Fechar Pagamento" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
