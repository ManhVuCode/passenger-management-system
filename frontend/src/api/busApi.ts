import axiosClient from './axiosClient';
import type { Bus } from '../types/transport';

export interface CreateBusPayload {
  licensePlate: string;
  busCode?: string;
  seatCount?: number;
}

export interface UpdateBusPayload {
  licensePlate?: string;
  busCode?: string;
  seatCount?: number;
  status?: string;
}

export const getBusesApi = async (): Promise<Bus[]> => {
  const { data } = await axiosClient.get<Bus[]>('/buses');
  return data;
};

export const getBusesByTripApi = async (tripId: string): Promise<Bus[]> => {
  const { data } = await axiosClient.get<Bus[]>(`/buses/trip/${tripId}`);
  return data;
};

export const createBusApi = async (payload: CreateBusPayload): Promise<Bus> => {
  const { data } = await axiosClient.post<Bus>('/buses', payload);
  return data;
};

export const updateBusApi = async (id: string, payload: UpdateBusPayload): Promise<Bus> => {
  const { data } = await axiosClient.patch<Bus>(`/buses/${id}`, payload);
  return data;
};

export const deleteBusApi = async (id: string): Promise<void> => {
  await axiosClient.delete(`/buses/${id}`);
};

export const busApi = {
  getAll: () => axiosClient.get<Bus[]>('/buses'),
  getByTrip: (tripId: string) => axiosClient.get<Bus[]>(`/buses/trip/${tripId}`),
  create: (payload: CreateBusPayload) => axiosClient.post<Bus>('/buses', payload),
  update: (id: string, payload: UpdateBusPayload) => axiosClient.patch<Bus>(`/buses/${id}`, payload),
  remove: (id: string) => axiosClient.delete(`/buses/${id}`),
};

// Backward-compatible alias
export const busApiLegacy = {
  getByTrip: (tripId: string) => axiosClient.get<Bus[]>(`/buses/trip/${tripId}`),
};

export const getBusesByTripLegacyApi = async (tripId: string): Promise<Bus[]> => {
  const { data } = await axiosClient.get<Bus[]>(`/buses/trip/${tripId}`);
  return data;
};
