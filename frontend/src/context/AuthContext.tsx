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

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        // Fetch user profile from Firestore
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: fbUser.uid,
              name: userData.name || fbUser.email?.split('@')[0] || 'User',
              role: userData.role || 'admin',
              email: userData.email || fbUser.email || '',
              phone: userData.phone || '',
            });
          } else {
            // User doc doesn't exist yet, create basic profile
            setUser({
              id: fbUser.uid,
              name: fbUser.email?.split('@')[0] || 'User',
              role: 'admin',
              email: fbUser.email || '',
            });
          }
        } catch {
          // Fallback if Firestore read fails
          setUser({
            id: fbUser.uid,
            name: fbUser.email?.split('@')[0] || 'User',
            role: 'admin',
            email: fbUser.email || '',
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try to sign in first
      const credential = await signInWithEmailAndPassword(auth, email, password);

      // Store/update user profile in Firestore
      const userDocRef = doc(db, 'users', credential.user.uid);
      await setDoc(userDocRef, {
        name: email.split('@')[0],
        email,
        role: 'admin',
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return true;
    } catch (signInError: any) {
      // If user doesn't exist, create account
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);

          // Create user profile in Firestore
          const userDocRef = doc(db, 'users', credential.user.uid);
          await setDoc(userDocRef, {
            name: email.split('@')[0],
            email,
            role: 'admin',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });

          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  };

  const loginCustomer = async (phone: string, otp: string): Promise<boolean> => {
    // For customer login, we use email/password under the hood
    // Phone becomes the email: phone@swarnapawn.customer
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const customerEmail = `${cleanPhone}@swarnapawn.customer`;
    const customerPassword = `cust_${cleanPhone}_${otp}`;

    try {
      // Try to sign in
      const credential = await signInWithEmailAndPassword(auth, customerEmail, customerPassword);

      const userDocRef = doc(db, 'users', credential.user.uid);
      await setDoc(userDocRef, {
        role: 'customer',
        phone: cleanPhone,
        lastLogin: serverTimestamp(),
      }, { merge: true });

      return true;
    } catch (signInError: any) {
      // If user doesn't exist, create account
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
        try {
          const credential = await createUserWithEmailAndPassword(auth, customerEmail, customerPassword);

          const userDocRef = doc(db, 'users', credential.user.uid);
          await setDoc(userDocRef, {
            name: `Customer ${cleanPhone.slice(-4)}`,
            phone: cleanPhone,
            email: customerEmail,
            role: 'customer',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });

          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Fallback: clear state manually
    }
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
