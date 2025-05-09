export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t py-4 mt-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {year} Sistema de Gerenciamento de Cadastros. Todos os direitos reservados.
        </p>
        <p className="text-center text-xs text-muted-foreground">Otimizado para Discloud</p>
      </div>
    </footer>
  )
}
