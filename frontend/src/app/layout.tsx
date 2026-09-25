'use client';

import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import { usePathname } from 'next/navigation';

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname.startsWith('/login');
  const isCustomerRoute = pathname.startsWith('/customer');
  const showAdminNavbar = !isLoginRoute && !isCustomerRoute;

  return (
    <AuthGuard>
      {showAdminNavbar && <Navbar />}
      {showAdminNavbar ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      ) : (
        children
      )}
    </AuthGuard>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Swarna Pawn - Gold Loan &amp; Vault Ledger System</title>
        <meta name="description" content="Automated Gold Loan Management System with WhatsApp Monthly Reminders & Real-time Vault Tracking" />
      </head>
      <body className="bg-slate-100 min-h-screen text-slate-900 antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
