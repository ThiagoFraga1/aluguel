"use client"

import { createContext, useContext, type ReactNode } from "react"

type User = {
  username: string
}

type AuthContextType = {
  user: User
  logout: () => void
}

// Usuário padrão sempre logado
const DEFAULT_USER: User = {
  username: "admin",
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Sempre retorna o usuário padrão como logado
  const user = DEFAULT_USER

  // Função de logout mantida por compatibilidade, mas não faz nada
  const logout = () => {
    console.log("Logout não implementado - sistema sempre logado")
  }

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
