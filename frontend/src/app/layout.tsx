import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Swarna Pawn - Gold Loan & Vault Ledger System',
  description: 'Automated Gold Loan Management System with WhatsApp Monthly Reminders & Real-time Vault Tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 min-h-screen text-slate-900 antialiased">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
