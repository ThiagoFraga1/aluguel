/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  images: {
    domains: ['discloud.app'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },
  // Remover configurações experimentais que podem causar problemas
  experimental: {
    // optimizeCss: true,
    // optimizePackageImports: ['lucide-react'],
  },
  // Corrigir configurações de output para Vercel
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  distDir: '.next', // Usar o diretório padrão do Next.js
  // Configurações para ignorar erros durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Adicionar configuração de redirecionamento estático
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
