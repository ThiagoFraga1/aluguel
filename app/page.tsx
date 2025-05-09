import Link from "next/link"

export default function Home() {
  // Usando metadata para definir redirecionamento HTTP
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-center">Sistema de Gerenciamento de Cadastros</h1>
      <p className="mt-4 text-center">Redirecionando para o dashboard...</p>
      <Link
        href="/dashboard"
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Ir para o Dashboard
      </Link>

      {/* Script para redirecionar no lado do cliente */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.location.href = '/dashboard';
          `,
        }}
      />
    </div>
  )
}
