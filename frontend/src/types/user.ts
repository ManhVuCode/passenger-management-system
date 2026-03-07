export type UserRole = 'TENANT_ADMIN' | 'STAFF' | 'DRIVER' | 'ASSISTANT';

export type CreateUserRole = Exclude<UserRole, 'TENANT_ADMIN'>;

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: CreateUserRole;
}

export interface UpdateUserPayload {
  fullName?: string;
  phone?: string;
}
