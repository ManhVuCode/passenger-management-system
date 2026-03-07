import axiosClient from './axiosClient';
import type { Trip, TripAssignment } from '../types/transport';

export const getTripsApi = async (): Promise<Trip[]> => {
  const { data } = await axiosClient.get<Trip[]>('/trips');
  return data;
};

export const getTripByIdApi = async (id: string): Promise<Trip> => {
  const { data } = await axiosClient.get<Trip>(`/trips/${id}`);
  return data;
};

export const createTripApi = async (payload: Partial<Trip>): Promise<Trip> => {
  const { data } = await axiosClient.post<Trip>('/trips', payload);
  return data;
};

export const updateTripApi = async (id: string, payload: Partial<Trip>): Promise<Trip> => {
  const { data } = await axiosClient.patch<Trip>(`/trips/${id}`, payload);
  return data;
};

export const deleteTripApi = async (tripId: string): Promise<void> => {
  await axiosClient.delete(`/trips/${tripId}`);
};

export const getTripAssignmentsApi = async (tripId: string): Promise<TripAssignment[]> => {
  const { data } = await axiosClient.get<TripAssignment[]>(`/trips/${tripId}/assignments`);
  return data;
};

export const createTripAssignmentApi = async (
  tripId: string,
  payload: { busId: string; driverId: string },
): Promise<TripAssignment> => {
  const { data } = await axiosClient.post<TripAssignment>(`/trips/${tripId}/assignments`, payload);
  return data;
};

export const updateTripAssignmentApi = async (
  assignmentId: string,
  payload: { busId?: string; driverId?: string },
): Promise<TripAssignment> => {
  const { data } = await axiosClient.patch<TripAssignment>(`/trip-assignments/${assignmentId}`, payload);
  return data;
};

export const deleteTripAssignmentApi = async (assignmentId: string): Promise<void> => {
  await axiosClient.delete(`/trip-assignments/${assignmentId}`);
};

export const tripApi = {
  getAll: () => axiosClient.get<Trip[]>('/trips'),
  getById: (id: string) => axiosClient.get<Trip>(`/trips/${id}`),
  create: (data: Partial<Trip>) => axiosClient.post<Trip>('/trips', data),
  update: (id: string, data: Partial<Trip>) => axiosClient.patch<Trip>(`/trips/${id}`, data),
  remove: (id: string) => axiosClient.delete(`/trips/${id}`),
  getAssignments: (id: string) => axiosClient.get<TripAssignment[]>(`/trips/${id}/assignments`),
  createAssignment: (id: string, data: { busId: string; driverId: string }) =>
    axiosClient.post<TripAssignment>(`/trips/${id}/assignments`, data),
  updateAssignment: (id: string, data: { busId?: string; driverId?: string }) =>
    axiosClient.patch<TripAssignment>(`/trip-assignments/${id}`, data),
  removeAssignment: (id: string) => axiosClient.delete(`/trip-assignments/${id}`),
};
