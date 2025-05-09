"use client"

import type React from "react"

import { useState, useEffect, memo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, CreditCard } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Entry } from "@/types/entry"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RenewDialogProps {
  entry: Entry
  isOpen: boolean
  onClose: () => void
  onRenew: (entry: Entry, newDate: string, cardBrand: string, cardLastDigits: string) => void
}

// Lista de bandeiras de cartão comuns
const cardBrands = ["Visa", "Mastercard", "Amex", "Elo", "Hipercard", "Diners"]

// Wrap the component with memo for better performance
export const RenewDialog = memo(function RenewDialog({ entry, isOpen, onClose, onRenew }: RenewDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [dateInputValue, setDateInputValue] = useState("")
  const [time, setTime] = useState("10:00")
  const [cardBrand, setCardBrand] = useState("")
  const [cardLastDigits, setCardLastDigits] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [dateInputMode, setDateInputMode] = useState<"calendar" | "text">("calendar")
  const [dateError, setDateError] = useState("")

  // Resetar os estados quando o diálogo é aberto
  useEffect(() => {
    if (isOpen) {
      setDate(undefined)
      setDateInputValue("")
      extractCurrentTime()
      setCardBrand("")
      setCardLastDigits("")
      setDateError("")
    }
  }, [isOpen])

  // Extrair a hora atual da data de devolução
  const extractCurrentTime = () => {
    const timePart = entry.data_devolucao.split(" ")[1]
    if (timePart && /^\d{2}:\d{2}$/.test(timePart)) {
      setTime(timePart)
    }
  }

  // Validar e converter a data digitada
  const validateAndParseDate = (inputValue: string) => {
    // Verificar se o formato é DD/MM/YYYY
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(inputValue)) {
      setDateError("Use o formato DD/MM/YYYY")
      return
    }

    // Tentar converter para um objeto Date
    const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date())

    if (!isValid(parsedDate)) {
      setDateError("Data inválida")
      return
    }

    // Verificar se a data é futura
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (parsedDate < today) {
      setDateError("A data deve ser futura")
      return
    }

    // Se chegou aqui, a data é válida
    setDateError("")
    setDate(parsedDate)
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDateInputValue(value)

    // Validar apenas se o campo estiver completo
    if (value.length === 10) {
      validateAndParseDate(value)
    } else {
      setDateError("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!date && dateInputMode === "calendar") return

    if (dateInputMode === "text" && dateInputValue) {
      validateAndParseDate(dateInputValue)
      if (dateError) return
    }

    // Usar a data do estado ou a data digitada
    const finalDate = date
    if (!finalDate) return

    // Formatar a nova data no formato esperado: "DD/MM/YYYY HH:MM"
    const day = finalDate.getDate().toString().padStart(2, "0")
    const month = (finalDate.getMonth() + 1).toString().padStart(2, "0")
    const year = finalDate.getFullYear()

    const newDateString = `${day}/${month}/${year} ${time}`

    onRenew(entry, newDateString, cardBrand, cardLastDigits)
    onClose()
  }

  // Validar se o formato do final do cartão está correto
  const isCardLastDigitsValid = () => {
    if (!cardLastDigits) return false

    // Verificar se começa com a primeira letra da bandeira seguida de números
    if (cardBrand === "Visa") {
      return /^V\d{4}$/.test(cardLastDigits)
    } else if (cardBrand === "Mastercard") {
      return /^M\d{4}$/.test(cardLastDigits)
    } else if (cardBrand === "Amex") {
      return /^AX\d{3}$/.test(cardLastDigits)
    } else if (cardBrand) {
      // Para outras bandeiras, usar a primeira letra
      const firstLetter = cardBrand.charAt(0).toUpperCase()
      const regex = new RegExp(`^${firstLetter}\\d{4}$`)
      return regex.test(cardLastDigits)
    }

    return false
  }

  // Gerar sugestão de formato para o final do cartão
  const getCardLastDigitsPlaceholder = () => {
    if (!cardBrand) return "Selecione uma bandeira primeiro"

    if (cardBrand === "Visa") return "V1234"
    if (cardBrand === "Mastercard") return "M1234"
    if (cardBrand === "Amex") return "AX123"

    // Para outras bandeiras
    const firstLetter = cardBrand.charAt(0).toUpperCase()
    return `${firstLetter}1234`
  }

  // Formatar automaticamente o final do cartão
  const formatCardLastDigits = (value: string) => {
    if (!cardBrand) return value

    let prefix = ""
    if (cardBrand === "Visa") prefix = "V"
    else if (cardBrand === "Mastercard") prefix = "M"
    else if (cardBrand === "Amex") prefix = "AX"
    else prefix = cardBrand.charAt(0).toUpperCase()

    // Remover o prefixo se já existir
    let digits = value
    if (cardBrand === "Amex") {
      if (value.startsWith("AX")) digits = value.substring(2)
    } else {
      if (value.startsWith(prefix)) digits = value.substring(1)
    }

    // Remover caracteres não numéricos
    digits = digits.replace(/\D/g, "")

    // Limitar o número de dígitos
    const maxDigits = cardBrand === "Amex" ? 3 : 4
    digits = digits.substring(0, maxDigits)

    return prefix + digits
  }

  // Função para lidar com a seleção de data
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      setDateInputValue(format(selectedDate, "dd/MM/yyyy"))
    }
    setCalendarOpen(false)
  }

  // Verificar se o botão de renovação deve estar habilitado
  const isRenewButtonEnabled = () => {
    if (!cardBrand || !isCardLastDigitsValid()) return false

    if (dateInputMode === "calendar") {
      return !!date
    } else {
      return dateInputValue.length === 10 && !dateError
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Renovar Cadastro</DialogTitle>
          <DialogDescription>Defina a nova data de devolução para {entry.nome}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-date">Data de Devolução Atual</Label>
              <Input id="current-date" value={entry.data_devolucao} disabled />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label>Nova Data de Devolução</Label>
                <Tabs
                  value={dateInputMode}
                  onValueChange={(value) => setDateInputMode(value as "calendar" | "text")}
                  className="w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="calendar" className="text-xs px-2 py-1">
                      Calendário
                    </TabsTrigger>
                    <TabsTrigger value="text" className="text-xs px-2 py-1">
                      Digitar
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex gap-2">
                {dateInputMode === "calendar" ? (
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        onClick={() => setCalendarOpen(true)}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="w-full">
                    <Input
                      placeholder="DD/MM/AAAA"
                      value={dateInputValue}
                      onChange={handleDateInputChange}
                      className={cn(dateError && "border-red-500")}
                    />
                    {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
                  </div>
                )}
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-24" />
              </div>
            </div>

            {/* Campos de cartão */}
            <div className="grid gap-4">
              <Label className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Cartão Utilizado na Renovação
              </Label>

              <div className="grid gap-2">
                <Label htmlFor="card-brand">Bandeira do Cartão</Label>
                <Select value={cardBrand} onValueChange={setCardBrand}>
                  <SelectTrigger id="card-brand">
                    <SelectValue placeholder="Selecione a bandeira" />
                  </SelectTrigger>
                  <SelectContent>
                    {cardBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {cardBrand === "Outro" ? (
                <div className="grid gap-2">
                  <Label htmlFor="other-card-brand">Especifique a Bandeira</Label>
                  <Input
                    id="other-card-brand"
                    placeholder="Digite a bandeira do cartão"
                    value={cardBrand === "Outro" ? "" : cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="card-last-digits">Final do Cartão</Label>
                <Input
                  id="card-last-digits"
                  placeholder={getCardLastDigitsPlaceholder()}
                  value={cardLastDigits}
                  onChange={(e) => setCardLastDigits(formatCardLastDigits(e.target.value))}
                  disabled={!cardBrand}
                />
                <p className="text-xs text-muted-foreground">
                  {cardBrand === "Visa" && "Formato: V seguido de 4 dígitos (ex: V1234)"}
                  {cardBrand === "Mastercard" && "Formato: M seguido de 4 dígitos (ex: M1234)"}
                  {cardBrand === "Amex" && "Formato: AX seguido de 3 dígitos (ex: AX123)"}
                  {cardBrand &&
                    !["Visa", "Mastercard", "Amex", "Outro"].includes(cardBrand) &&
                    `Formato: ${cardBrand.charAt(0)} seguido de 4 dígitos (ex: ${cardBrand.charAt(0)}1234)`}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isRenewButtonEnabled()}>
              Renovar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})
