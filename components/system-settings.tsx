"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Save } from "lucide-react"

// Interface para as configurações do sistema
export interface SystemSettings {
  pixKey: string
  paymentDay: string
  companyName: string
}

// Chave para armazenar as configurações no localStorage
const SETTINGS_KEY = "cadastro-system-settings"

// Configurações padrão
const DEFAULT_SETTINGS: SystemSettings = {
  pixKey: "",
  paymentDay: "Sexta-feira",
  companyName: "Minha Empresa",
}

interface SystemSettingsProps {
  onSettingsChange: (settings: SystemSettings) => void
}

export default function SystemSettings({ onSettingsChange }: SystemSettingsProps) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const { toast } = useToast()

  // Carregar configurações do localStorage quando o componente é montado
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY)
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
        onSettingsChange(parsedSettings)
      } catch (error) {
        console.error("Erro ao carregar configurações:", error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Salvar configurações
  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    onSettingsChange(settings)

    toast({
      title: "Configurações salvas",
      description: "As configurações do sistema foram atualizadas com sucesso.",
      duration: 3000,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Sistema</CardTitle>
        <CardDescription>Configure informações gerais e dados de pagamento</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="Nome da sua empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDay">Dia de Pagamento</Label>
              <Input
                id="paymentDay"
                value={settings.paymentDay}
                onChange={(e) => setSettings({ ...settings, paymentDay: e.target.value })}
                placeholder="Ex: Sexta-feira"
              />
              <p className="text-xs text-muted-foreground">Dia da semana em que os pagamentos são realizados</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              value={settings.pixKey}
              onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
              placeholder="Sua chave PIX para recebimento"
            />
            <p className="text-xs text-muted-foreground">Esta chave será exibida nos resumos de pagamento</p>
          </div>

          <Button onClick={saveSettings} className="w-full sm:w-auto flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
