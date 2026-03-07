import type { AuthUser } from '../types/auth';
import type { UserRole } from '../types/user';

export const ACCESS_TOKEN_KEY = 'pms_access_token';
export const USER_STORAGE_KEY = 'pms_user';

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);

export const setAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      const parsedRole = parsed.role as UserRole | undefined;
      return {
        id: parsed.id,
        email: parsed.email,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
        tenantId: typeof parsed.tenantId === 'string' ? parsed.tenantId : undefined,
        role:
          parsedRole === 'TENANT_ADMIN' ||
          parsedRole === 'STAFF' ||
          parsedRole === 'DRIVER' ||
          parsedRole === 'ASSISTANT'
            ? parsedRole
            : undefined,
      };
    }
  } catch {
    // Ignore malformed storage and treat as logged out.
  }

  return null;
};

export const setStoredUser = (user: AuthUser): void => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthStorage = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};
