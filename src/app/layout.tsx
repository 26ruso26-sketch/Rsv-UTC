import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SREU | Sistema de Reservación de Espacios Universitarios',
  description:
    'Sistema institucional para la gestión de eventos, solicitudes, autorizaciones, disponibilidad y reservación de espacios universitarios.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}

