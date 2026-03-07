import axios, { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

const joinMessages = (message: string | string[] | undefined): string | null => {
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0) {
    return message.join(', ');
  }

  return null;
};

export class ApiRequestError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
  }
}

export const getErrorStatusCode = (error: unknown): number | undefined => {
  if (error instanceof ApiRequestError) {
    return error.statusCode;
  }

  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.status;
  }

  return undefined;
};

export const isNotFoundError = (error: unknown): boolean => getErrorStatusCode(error) === 404;

export const getReadableApiMessage = (error: AxiosError<ApiErrorResponse>): string => {
  const serverMessage = joinMessages(error.response?.data?.message);
  if (serverMessage) {
    return serverMessage;
  }

  if (typeof error.response?.data?.error === 'string' && error.response.data.error.trim().length > 0) {
    return error.response.data.error;
  }

  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  return FALLBACK_MESSAGE;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return getReadableApiMessage(error);
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return FALLBACK_MESSAGE;
};
