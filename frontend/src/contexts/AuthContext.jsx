/**
 * AuthContext — Global authentication state management
 * Provides user state, login/logout methods across the entire app.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider, appleProvider } from '../lib/firebase';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ─── Email/Password Sign Up ───────────────────
  const signUpWithEmail = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  };

  // ─── Email/Password Sign In ───────────────────
  const signInWithEmail = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  // ─── Google Sign In ───────────────────────────
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // ─── Facebook Sign In ─────────────────────────
  const signInWithFacebook = async () => {
    const result = await signInWithPopup(auth, facebookProvider);
    return result.user;
  };

  // ─── Apple Sign In ────────────────────────────
  const signInWithApple = async () => {
    const result = await signInWithPopup(auth, appleProvider);
    return result.user;
  };

  // ─── Logout ───────────────────────────────────
  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
