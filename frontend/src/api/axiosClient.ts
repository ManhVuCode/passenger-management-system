import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { notification } from 'antd';
import type { ApiErrorResponse } from '../types/api';
import { ApiRequestError, getReadableApiMessage } from '../utils/error';
import { clearAuthStorage, getAccessToken } from '../utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const SILENT_ERROR_HEADER = 'x-silent-error';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAccessToken();

    if (token) {
      const headers =
        config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

const redirectToLogin = (): void => {
  if (window.location.pathname === '/login') {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const redirect = encodeURIComponent(currentPath);
  window.location.replace(`/login?redirect=${redirect}`);
};

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const statusCode = error.response?.status;
    const readableMessage = getReadableApiMessage(error);
    const headers = new AxiosHeaders(error.config?.headers);
    const isSilentError = headers.get(SILENT_ERROR_HEADER) === 'true';

    if (statusCode === 401) {
      clearAuthStorage();
      redirectToLogin();
      return Promise.reject(new ApiRequestError('Your session has expired. Please sign in again.', 401));
    }

    if (!isSilentError && statusCode && statusCode >= 400) {
      notification.error({
        message: 'Request failed',
        description: readableMessage,
      });
    }

    return Promise.reject(new ApiRequestError(readableMessage, statusCode));
  },
);

export default axiosClient;
