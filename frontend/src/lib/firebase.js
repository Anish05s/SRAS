/**
 * Firebase Configuration — SRAS
 * Firestore for shared real-time data across all users.
 * Auth for user authentication (Email, Google, Facebook, Apple).
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
  projectId: "sras-live-2026",
  appId: "1:471639913551:web:6f2cd4a914d83d38ffa63a",
  storageBucket: "sras-live-2026.firebasestorage.app",
  apiKey: "AIzaSyCxV94RbyEg48cqGBPXhYaOpyOR6IgfB5A",
  authDomain: "sras-live-2026.firebaseapp.com",
  messagingSenderId: "471639913551",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

export default app;
