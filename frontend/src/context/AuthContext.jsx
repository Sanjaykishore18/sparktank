import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('VoiceCraft_token');
    const savedUser = localStorage.getItem('VoiceCraft_user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token with server
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('VoiceCraft_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('VoiceCraft_token');
          localStorage.removeItem('VoiceCraft_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential });
      const { token, user: userData } = res.data;
      localStorage.setItem('VoiceCraft_token', token);
      localStorage.setItem('VoiceCraft_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      throw new Error('Google login failed');
    }
  };

  const loginDemo = async (name, email) => {
    try {
      const res = await api.post('/auth/demo', {
        name: name || 'Demo User',
        email: email || 'demo@VoiceCraft.com'
      });
      const { token, user: userData } = res.data;
      localStorage.setItem('VoiceCraft_token', token);
      localStorage.setItem('VoiceCraft_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      throw new Error('Demo login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('VoiceCraft_token');
    localStorage.removeItem('VoiceCraft_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('VoiceCraft_user', JSON.stringify(updatedUser));
  };

  const upgradePlan = async () => {
    try {
      const res = await api.post('/auth/upgrade');
      const updated = { ...user, plan: 'premium' };
      updateUser(updated);
      return updated;
    } catch (error) {
      throw new Error('Upgrade failed');
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, loginWithGoogle, loginDemo, logout, updateUser, upgradePlan
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
