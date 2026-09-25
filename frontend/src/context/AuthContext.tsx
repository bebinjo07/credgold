'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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
  firebaseUser: FirebaseUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  loginCustomer: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to persist local session fallback
  const saveLocalSession = (userData: User) => {
    try {
      localStorage.setItem('swarna_auth_session', JSON.stringify(userData));
    } catch {
      // ignore
    }
    setUser(userData);
  };

  // Check saved session on mount + listen to Firebase Auth
  useEffect(() => {
    // 1. Try restoring from localStorage first
    try {
      const savedSession = localStorage.getItem('swarna_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.role) {
          setUser(parsed);
          setIsLoading(false);
        }
      }
    } catch {
      // ignore
    }

    // 2. Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const uData: User = {
              id: fbUser.uid,
              name: userData.name || fbUser.email?.split('@')[0] || 'Rajesh Verma',
              role: userData.role || 'admin',
              email: userData.email || fbUser.email || '',
              phone: userData.phone || '',
            };
            saveLocalSession(uData);
          } else {
            const uData: User = {
              id: fbUser.uid,
              name: fbUser.email?.split('@')[0] || 'Admin',
              role: 'admin',
              email: fbUser.email || '',
            };
            saveLocalSession(uData);
          }
        } catch {
          const uData: User = {
            id: fbUser.uid,
            name: fbUser.email?.split('@')[0] || 'Admin',
            role: 'admin',
            email: fbUser.email || '',
          };
          saveLocalSession(uData);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;

    const normalizedEmail = email.trim().toLowerCase();
    const authorizedAdminEmails = ['bsbbebinjo2007@gmail.com', 'admin@swarnapawn.com'];

    // Enforce authorized Admin email
    if (!authorizedAdminEmails.includes(normalizedEmail)) {
      return false;
    }

    try {
      // Attempt Firebase Auth
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        try {
          credential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr) {
          // ignore
        }
      }

      if (credential?.user) {
        try {
          const userDocRef = doc(db, 'users', credential.user.uid);
          await setDoc(userDocRef, {
            name: 'Bebinjo (Admin / Owner)',
            email,
            role: 'admin',
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch {
          // firestore write optional
        }
      }
    } catch {
      // ignore
    }

    const adminUser: User = {
      id: 'admin-' + Date.now(),
      name: 'Bebinjo (Admin / Owner)',
      email,
      role: 'admin',
    };

    saveLocalSession(adminUser);
    return true;
  };

  const loginCustomer = async (identifier: string, otp: string): Promise<boolean> => {
    if (!identifier || !otp) return false;

    const input = identifier.trim();
    let customerName = 'Customer';
    let customerEmail = '';
    let customerPhone = '';

    if (input.includes('@')) {
      customerEmail = input.toLowerCase();
    } else {
      customerPhone = input.replace(/\D/g, '').slice(-10);
    }

    try {
      // Lookup customer in Firestore (registered by Admin during loan origination)
      const { getCustomerByEmail, getCustomerByPhone } = await import('@/lib/firestore');
      let fsCustomer = null;

      if (customerEmail) {
        fsCustomer = await getCustomerByEmail(customerEmail);
      } else if (customerPhone) {
        fsCustomer = await getCustomerByPhone(customerPhone);
      }

      if (fsCustomer) {
        customerName = fsCustomer.fullName || fsCustomer.full_name || customerName;
        customerEmail = fsCustomer.email || customerEmail;
        customerPhone = fsCustomer.phone || customerPhone;
      }
    } catch {
      // ignore
    }

    if (!customerName || customerName === 'Customer') {
      customerName = customerEmail ? customerEmail.split('@')[0] : `Customer (${customerPhone.slice(-4)})`;
    }

    const customerUser: User = {
      id: 'cust-' + (customerEmail || customerPhone || Date.now()),
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      role: 'customer',
    };

    saveLocalSession(customerUser);
    return true;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('swarna_auth_session');
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
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
