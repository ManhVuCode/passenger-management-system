import { useCallback, useMemo, useState, type PropsWithChildren, type ReactElement } from 'react';
import { loginApi } from '../api/authApi';
import { AuthContext } from './auth-context';
import type { AuthUser, LoginRequest } from '../types/auth';
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  setAccessToken,
  setStoredUser,
} from '../utils/storage';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

const readInitialAuthState = (): AuthState => ({
  token: getAccessToken(),
  user: getStoredUser(),
});

export const AuthProvider = ({ children }: PropsWithChildren): ReactElement => {
  const [authState, setAuthState] = useState<AuthState>(readInitialAuthState);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const response = await loginApi(credentials);

    setAccessToken(response.access_token);
    setStoredUser(response.user);

    setAuthState({
      token: response.access_token,
      user: response.user,
    });
  }, []);

  const logout = useCallback((): void => {
    clearAuthStorage();
    setAuthState({ token: null, user: null });
  }, []);

  const contextValue = useMemo(
    () => ({
      token: authState.token,
      user: authState.user,
      isAuthenticated: Boolean(authState.token && authState.user),
      isInitializing: false,
      login,
      logout,
    }),
    [authState.token, authState.user, login, logout],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
