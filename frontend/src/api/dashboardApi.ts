import axiosClient from './axiosClient';

export interface DashboardStats {
  totalTrips: number;
  totalPassengers: number;
}

export const getDashboardStatsApi = async (): Promise<DashboardStats> => {
  const { data } = await axiosClient.get<DashboardStats>('/dashboard/stats');
  return data;
};

