/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    // La exportación de reportes lee templates/reporte-eventos-erm-utc.xlsx en
    // tiempo de ejecución: hay que incluirlo en el bundle del servidor.
    outputFileTracingIncludes: {
      '/api/reports/export': ['./templates/**'],
    },
  },
};

export default nextConfig;

