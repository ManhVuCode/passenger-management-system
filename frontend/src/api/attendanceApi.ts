import axiosClient from './axiosClient';
import type { AttendanceRecord, AttendanceSavePayload } from '../types/transport';
import { isNotFoundError } from '../utils/error';

interface AttendanceQuery {
  roundId?: string;
}

export const getAttendanceApi = async (params: AttendanceQuery): Promise<AttendanceRecord[]> => {
  try {
    const { data } = await axiosClient.get<AttendanceRecord[]>('/attendance', {
      params,
      headers: { 'x-silent-error': 'true' },
    });
    return data;
  } catch (error: unknown) {
    if (params.roundId && isNotFoundError(error)) {
      const { data } = await axiosClient.get<AttendanceRecord[]>(`/attendance/round/${params.roundId}`);
      return data;
    }

    throw error;
  }
};

export const saveAttendanceApi = async (
  payload: AttendanceSavePayload,
): Promise<AttendanceRecord> => {
  const { data } = await axiosClient.post<AttendanceRecord>('/attendance', payload);
  return data;
};

export const attendanceApi = {
  getByRound: (roundId: string) =>
    axiosClient
      .get<AttendanceRecord[]>('/attendance', {
        params: { roundId },
        headers: { 'x-silent-error': 'true' },
      })
      .catch(async (error: unknown) => {
        if (isNotFoundError(error)) {
          return axiosClient.get<AttendanceRecord[]>(`/attendance/round/${roundId}`);
        }

        throw error;
      }),
  checkIn: (data: { roundId: string; passengerId: string; isPresent: boolean; note?: string }) =>
    axiosClient.post<AttendanceRecord>('/attendance', data),
};
