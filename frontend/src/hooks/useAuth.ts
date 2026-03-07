import { useContext } from 'react';
import type { AuthContextValue } from '../types/auth';
import { AuthContext } from '../contexts/auth-context';

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
