import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBkJN-ycaN-rsQeNfE8j8NtJpQ9_3wDCms",
  authDomain: "swarna-pawn.firebaseapp.com",
  projectId: "swarna-pawn",
  storageBucket: "swarna-pawn.firebasestorage.app",
  messagingSenderId: "475482650964",
  appId: "1:475482650964:web:ff4a43e0824dd6f4c8f0c1",
  measurementId: "G-LY5WSEJV3Q"
};

// Initialize Firebase (prevent re-initialization in development)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase Auth
export const auth = getAuth(app);

// Firestore Database
export const db = getFirestore(app);

export default app;
