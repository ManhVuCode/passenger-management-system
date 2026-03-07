import axiosClient from './axiosClient';
import type { Passenger } from '../types/transport';
import { isNotFoundError } from '../utils/error';

interface PassengerQuery {
  tripId?: string;
}

export const getPassengersApi = async (params: PassengerQuery): Promise<Passenger[]> => {
  try {
    const { data } = await axiosClient.get<Passenger[]>('/passengers', {
      params,
      headers: { 'x-silent-error': 'true' },
    });
    return data;
  } catch (error: unknown) {
    if (params.tripId && isNotFoundError(error)) {
      const { data } = await axiosClient.get<Passenger[]>(`/passengers/trip/${params.tripId}`);
      return data;
    }

    throw error;
  }
};

export const createPassengerApi = async (payload: {
  tripId: string;
  fullName: string;
  phone: string;
  email?: string;
  busId?: string;
}): Promise<Passenger> => {
  const { data } = await axiosClient.post<Passenger>('/passengers', payload);
  return data;
};

export const assignPassengerBusApi = async (passengerId: string, busId: string): Promise<void> => {
  await axiosClient.patch(`/passengers/${passengerId}/assign-bus`, { busId });
};

export const updatePassengerApi = async (
  id: string,
  payload: { fullName?: string; phone?: string; email?: string; busId?: string },
): Promise<Passenger> => {
  const { data } = await axiosClient.patch<Passenger>(`/passengers/${id}`, payload);
  return data;
};

export const deletePassengerApi = async (id: string): Promise<void> => {
  await axiosClient.delete(`/passengers/${id}`);
};

export const passengerApi = {
  getByTrip: (tripId: string) =>
    axiosClient
      .get<Passenger[]>('/passengers', {
        params: { tripId },
        headers: { 'x-silent-error': 'true' },
      })
      .catch(async (error: unknown) => {
        if (isNotFoundError(error)) {
          return axiosClient.get<Passenger[]>(`/passengers/trip/${tripId}`);
        }

        throw error;
      }),
  create: (data: { tripId: string; fullName: string; phone: string; email?: string; busId?: string }) =>
    axiosClient.post<Passenger>('/passengers', data),
  update: (id: string, data: { fullName?: string; phone?: string; email?: string; busId?: string }) =>
    axiosClient.patch<Passenger>(`/passengers/${id}`, data),
  remove: (id: string) => axiosClient.delete(`/passengers/${id}`),
  assignBus: (passengerId: string, busId: string) =>
    axiosClient.patch(`/passengers/${passengerId}/assign-bus`, { busId }),
};
