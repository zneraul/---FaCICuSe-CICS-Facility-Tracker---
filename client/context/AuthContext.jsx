import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../services/firebase.js';
import { apiRequest, setAuthToken, setDemoSessionToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authConfig, setAuthConfig] = useState({
    allowedDomainsConfigured: false,
    allowedDomains: [],
    demoAccounts: [],
  });

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiRequest('/auth/me');
      setUser(data.user || null);
      setAuthError('');
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    apiRequest('/auth/config')
      .then((cfg) => setAuthConfig(cfg))
      .catch(() => {});

    let active = true;
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!active) return;
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setDemoSessionToken(null);
          setAuthToken(token);
          const data = await apiRequest('/auth/me');
          if (active) {
            setUser(data.user);
            setAuthError('');
          }
        } catch (err) {
          setAuthToken(null);
          if (active) {
            setAuthError(err.message || 'Unable to verify university account.');
            setUser(null);
          }
        } finally {
          if (active) setLoading(false);
        }
      } else {
        setAuthToken(null);
        try {
          const data = await apiRequest('/auth/session');
          if (active) {
            if (!data.user) {
              setDemoSessionToken(null);
            }
            setUser(data.user || null);
          }
        } catch {
          setDemoSessionToken(null);
          if (active) setUser(null);
        } finally {
          if (active) setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    setAuthError('');
    setDemoSessionToken(null);
    const result = await signInWithPopup(auth, googleAuthProvider);
    const token = await result.user.getIdToken();
    setAuthToken(token);
    try {
      const data = await apiRequest('/auth/me');
      setUser(data.user);
      return data.user;
    } catch (err) {
      await signOut(auth).catch(() => {});
      setAuthToken(null);
      setAuthError(err.message);
      throw err;
    }
  }

  async function signInDemo(role) {
    setAuthError('');
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
      setAuthToken(null);
    }
    const data = await apiRequest('/auth/demo-session', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    if (data.sessionToken) {
      setDemoSessionToken(data.sessionToken);
    }
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    setAuthError('');
    setAuthToken(null);
    setDemoSessionToken(null);
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        authConfig,
        signInWithGoogle,
        signInDemo,
        logout,
        refreshProfile,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
