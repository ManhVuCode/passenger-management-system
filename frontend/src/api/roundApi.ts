import axiosClient from './axiosClient';
import type { Round } from '../types/transport';
import { isNotFoundError } from '../utils/error';

export const getRoundsByTripApi = async (tripId: string): Promise<Round[]> => {
  try {
    const { data } = await axiosClient.get<Round[]>('/rounds', {
      params: { tripId },
      headers: { 'x-silent-error': 'true' },
    });
    return data;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      const { data } = await axiosClient.get<Round[]>(`/rounds/${tripId}`);
      return data;
    }

    throw error;
  }
};

export const createRoundApi = async (payload: {
  tripId: string;
  name: string;
  departureTime: string;
  sortOrder?: number;
}): Promise<Round> => {
  const { data } = await axiosClient.post<Round>('/rounds', payload);
  return data;
};

export const updateRoundApi = async (
  id: string,
  payload: { name?: string; departureTime?: string },
): Promise<Round> => {
  const { data } = await axiosClient.patch<Round>(`/rounds/${id}`, payload);
  return data;
};

export const deleteRoundApi = async (id: string): Promise<void> => {
  await axiosClient.delete(`/rounds/${id}`);
};

export const roundApi = {
  getByTrip: (tripId: string) =>
    axiosClient
      .get<Round[]>('/rounds', {
        params: { tripId },
        headers: { 'x-silent-error': 'true' },
      })
      .catch(async (error: unknown) => {
        if (isNotFoundError(error)) {
          return axiosClient.get<Round[]>(`/rounds/${tripId}`);
        }

        throw error;
      }),
  create: (data: { tripId: string; name: string; departureTime: string; sortOrder?: number }) =>
    axiosClient.post<Round>('/rounds', data),
  update: (id: string, data: { name?: string; departureTime?: string }) =>
    axiosClient.patch<Round>(`/rounds/${id}`, data),
  remove: (id: string) => axiosClient.delete(`/rounds/${id}`),
};
