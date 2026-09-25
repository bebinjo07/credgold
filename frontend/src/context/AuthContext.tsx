'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'customer' | null;

interface User {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  loginCustomer: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials
const DEMO_ADMINS = [
  { email: 'admin@swarnapawn.com', password: 'admin123', name: 'Rajesh Verma', id: 'admin-001' },
  { email: 'staff@swarnapawn.com', password: 'staff123', name: 'Priya Staff', id: 'staff-001' },
];

const DEMO_CUSTOMERS = [
  { phone: '9840123456', name: 'Anand Ramesh', id: 'cust-001' },
  { phone: '9840765432', name: 'Priya Sundaram', id: 'cust-002' },
  { phone: '9840911223', name: 'Karthik Raja', id: 'cust-003' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('swarna_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const saveSession = (userData: User) => {
    localStorage.setItem('swarna_auth', JSON.stringify(userData));
    setUser(userData);
  };

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));

    const match = DEMO_ADMINS.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );

    if (match) {
      saveSession({ id: match.id, name: match.name, role: 'admin', email: match.email });
      return true;
    }

    // Also allow any email/password for demo purposes
    if (email && password.length >= 4) {
      saveSession({ id: 'admin-demo', name: email.split('@')[0], role: 'admin', email });
      return true;
    }

    return false;
  };

  const loginCustomer = async (phone: string, otp: string): Promise<boolean> => {
    // Simulate OTP verification
    await new Promise((r) => setTimeout(r, 800));

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const match = DEMO_CUSTOMERS.find((c) => c.phone === cleanPhone);

    // Accept OTP "1234" for demo, or any 4+ digit OTP
    if (otp.length >= 4) {
      saveSession({
        id: match?.id || `cust-${cleanPhone}`,
        name: match?.name || `Customer ${cleanPhone.slice(-4)}`,
        role: 'customer',
        phone: cleanPhone,
      });
      return true;
    }

    return false;
  };

  const logout = () => {
    localStorage.removeItem('swarna_auth');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        loginAdmin,
        loginCustomer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
