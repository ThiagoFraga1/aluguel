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
  experimental: {
    // Remover otimizações experimentais que podem causar problemas
    // optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  // Discloud specific settings
  output: 'standalone',
  distDir: 'dist',
  // Configurações para ignorar erros durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
