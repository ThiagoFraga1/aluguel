// Vamos simplificar a página inicial para evitar problemas de redirecionamento

import { redirect } from "next/navigation"

export default function Home() {
  // Usar try/catch para evitar erros durante o build
  try {
    redirect("/dashboard")
  } catch (error) {
    console.error("Erro ao redirecionar:", error)
  }

  // Renderizar um fallback caso o redirecionamento falhe
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Sistema de Gerenciamento de Cadastros</h1>
      <p className="mt-4">Carregando...</p>
      <a href="/dashboard" className="mt-4 text-blue-500 hover:underline">
        Ir para o Dashboard
      </a>
    </div>
  )
}
