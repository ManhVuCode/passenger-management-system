import axiosClient from './axiosClient';
import type { CreateUserPayload, UpdateUserPayload, UserListItem } from '../types/user';

export const userApi = {
  getAll: () => axiosClient.get<UserListItem[]>('/users'),
  create: (payload: CreateUserPayload) => axiosClient.post<UserListItem>('/users', payload),
  update: (userId: string, payload: UpdateUserPayload) =>
    axiosClient.patch<UserListItem>(`/users/${userId}`, payload),
  remove: (userId: string) => axiosClient.delete<{ message: string }>(`/users/${userId}`),
};
