import axiosClient from './axiosClient';
import type { LoginRequest, LoginResponse } from '../types/auth';

export const loginApi = async (payload: LoginRequest): Promise<LoginResponse> => {
  const { data } = await axiosClient.post<LoginResponse>('/auth/login', payload);
  return data;
};
