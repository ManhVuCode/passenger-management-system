import type { Dayjs } from 'dayjs';
import type { AttendanceRecord } from '../../types/transport';

export type AttendanceStatusFilter = 'all' | 'present' | 'absent';

export interface RoundSlot {
  id: string;
  name: string;
}

export interface AttendanceFilters {
  tripId: string | null;
  date: Dayjs | null;
  busIds: string[];
  status: AttendanceStatusFilter;
  keyword: string;
}

export interface AttendanceRow {
  key: string;
  passengerId: string;
  passengerName: string;
  phone: string;
  busId?: string;
  busLabel: string;
  roundRecords: Record<string, AttendanceRecord | undefined>;
  noteByRound: Record<string, string>;
}
