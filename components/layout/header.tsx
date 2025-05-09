"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Download, Save, Upload } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface HeaderProps {
  onSave: () => void
  onExport: () => void
  onImport: () => void
  entriesCount: number
}

export function Header({ onSave, onExport, onImport, entriesCount }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Sistema de Gerenciamento</h1>
          {entriesCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {entriesCount} cadastros
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-muted-foreground mr-2">
              Olá, <span className="font-medium">{user.username}</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            className="flex items-center gap-1"
            title="Salvar dados manualmente"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex items-center gap-1"
            title="Exportar dados para arquivo"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImport}
            className="flex items-center gap-1"
            title="Importar dados de arquivo"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <ThemeToggle />
          {user && (
            <span className="text-sm text-muted-foreground ml-2 px-2 py-1 bg-primary/10 rounded-md">
              <span className="font-medium">{user.username}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
