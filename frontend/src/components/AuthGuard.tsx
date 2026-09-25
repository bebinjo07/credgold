'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/login/admin', '/login/customer'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r);
  const isCustomerRoute = pathname.startsWith('/customer');
  const isAdminRoute = !isPublicRoute && !isCustomerRoute;

  useEffect(() => {
    if (isLoading) return;

    // Not logged in and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
      return;
    }

    // Logged in and trying to access login page
    if (isAuthenticated && isPublicRoute) {
      if (role === 'customer') {
        router.replace('/customer');
      } else {
        router.replace('/');
      }
      return;
    }

    // Customer trying to access admin routes
    if (isAuthenticated && role === 'customer' && isAdminRoute) {
      router.replace('/customer');
      return;
    }

    // Admin trying to access customer routes
    if (isAuthenticated && role === 'admin' && isCustomerRoute) {
      router.replace('/');
      return;
    }
  }, [isAuthenticated, isLoading, role, pathname, router, isPublicRoute, isCustomerRoute, isAdminRoute]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  // Don't render wrong-role content
  if (isAuthenticated && role === 'customer' && isAdminRoute) {
    return null;
  }

  if (isAuthenticated && role === 'admin' && isCustomerRoute) {
    return null;
  }

  return <>{children}</>;
}
