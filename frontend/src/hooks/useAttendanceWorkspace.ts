import { message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAttendanceApi, saveAttendanceApi } from '../api/attendanceApi';
import { getPassengersApi, updatePassengerApi } from '../api/passengerApi';
import { getRoundsByTripApi } from '../api/roundApi';
import { getTripAssignmentsApi, getTripsApi } from '../api/tripApi';
import type { AttendanceRecord, Passenger, Round, Trip } from '../types/transport';
import { getErrorMessage } from '../utils/error';
import type {
  AttendanceFilters,
  AttendanceRow,
  AttendanceStatusFilter,
  RoundSlot,
} from '../features/attendance/attendance.types';

interface BusFilterOption {
  value: string;
  label: string;
}

interface UseAttendanceWorkspaceResult {
  filters: AttendanceFilters;
  trips: Trip[];
  roundSlots: RoundSlot[];
  busOptions: BusFilterOption[];
  tripBusOptions: BusFilterOption[];
  rows: AttendanceRow[];
  isLoading: boolean;
  savingKeys: string[];
  onTripChange: (tripId: string) => void;
  onDateChange: (date: Dayjs | null) => void;
  onBusChange: (busIds: string[]) => void;
  onStatusChange: (status: AttendanceStatusFilter) => void;
  onKeywordChange: (value: string) => void;
  onChangePassengerBus: (row: AttendanceRow, busId: string) => Promise<void>;
  onToggleRound: (row: AttendanceRow, roundId: string, checked: boolean) => Promise<void>;
  onNoteChange: (passengerId: string, roundId: string, value: string) => void;
  onSaveNote: (row: AttendanceRow, roundId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const buildBusLabel = (passenger: Passenger): string =>
  passenger.bus?.busCode ?? passenger.bus?.licensePlate ?? 'Unassigned';

const upsertRecord = (records: AttendanceRecord[], nextRecord: AttendanceRecord): AttendanceRecord[] => {
  const index = records.findIndex((item) => item.passengerId === nextRecord.passengerId);
  if (index === -1) {
    return [nextRecord, ...records];
  }

  const next = [...records];
  next[index] = nextRecord;
  return next;
};

export const useAttendanceWorkspace = (): UseAttendanceWorkspaceResult => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [tripBusOptions, setTripBusOptions] = useState<BusFilterOption[]>([]);
  const [recordsByRound, setRecordsByRound] = useState<Record<string, AttendanceRecord[]>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<AttendanceFilters>({
    tripId: null,
    date: null,
    busIds: [],
    status: 'all',
    keyword: '',
  });

  const roundSlots = useMemo<RoundSlot[]>(() => {
    const sortedRounds = [...rounds].sort(
      (a, b) => dayjs(a.departureTime).valueOf() - dayjs(b.departureTime).valueOf(),
    );
    return sortedRounds.map((round) => ({
      id: round.id,
      name: round.name,
    }));
  }, [rounds]);

  const busOptions = useMemo<BusFilterOption[]>(() => {
    const options = new Map<string, string>();

    passengers.forEach((passenger) => {
      if (passenger.busId) {
        options.set(passenger.busId, buildBusLabel(passenger));
      }
    });

    return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
  }, [passengers]);

  const loadAttendanceRecords = useCallback(async (roundIds: string[]): Promise<void> => {
    if (!roundIds.length) {
      setRecordsByRound({});
      return;
    }

    const responses = await Promise.all(roundIds.map((roundId) => getAttendanceApi({ roundId })));
    const mapped: Record<string, AttendanceRecord[]> = {};

    roundIds.forEach((roundId, index) => {
      mapped[roundId] = responses[index];
    });

    setRecordsByRound(mapped);
  }, []);

  const loadTripData = useCallback(
    async (tripId: string): Promise<void> => {
      setIsLoading(true);

      try {
        const [tripPassengers, tripRounds, assignments] = await Promise.all([
          getPassengersApi({ tripId }),
          getRoundsByTripApi(tripId),
          getTripAssignmentsApi(tripId),
        ]);

        setPassengers(tripPassengers);
        setRounds(tripRounds);
        setTripBusOptions(
          assignments
            .filter((item) => item.bus)
            .map((item) => ({
              value: item.busId,
              label: item.bus?.busCode
                ? `${item.bus.busCode} (${item.bus.licensePlate})`
                : (item.bus?.licensePlate ?? 'Unassigned'),
            })),
        );

        const sortedRounds = [...tripRounds].sort(
          (a, b) => dayjs(a.departureTime).valueOf() - dayjs(b.departureTime).valueOf(),
        );
        const roundIds = sortedRounds.map((round) => round.id);
        await loadAttendanceRecords(roundIds);

        setNoteDrafts({});
      } catch (error: unknown) {
        message.error(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [loadAttendanceRecords],
  );

  const loadTrips = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const tripData = await getTripsApi();
      setTrips(tripData);

      if (!tripData.length) {
        setFilters((prev) => ({ ...prev, tripId: null }));
        setRounds([]);
        setPassengers([]);
        setRecordsByRound({});
        return;
      }

      const initialTripId = filters.tripId ?? tripData[0].id;
      setFilters((prev) => ({ ...prev, tripId: initialTripId }));
      await loadTripData(initialTripId);
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [filters.tripId, loadTripData]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const rows = useMemo<AttendanceRow[]>(() => {
    const searchLower = filters.keyword.trim().toLowerCase();

    return passengers
      .map((passenger) => {
        const roundRecords = roundSlots.reduce<Record<string, AttendanceRecord | undefined>>(
          (acc, slot) => {
            acc[slot.id] = (recordsByRound[slot.id] ?? []).find(
              (record) => record.passengerId === passenger.id,
            );
            return acc;
          },
          {},
        );

        const noteByRound = roundSlots.reduce<Record<string, string>>((acc, slot) => {
          const draftKey = `${slot.id}:${passenger.id}`;
          acc[slot.id] = noteDrafts[draftKey] ?? roundRecords[slot.id]?.note ?? '';
          return acc;
        }, {});

        const row: AttendanceRow = {
          key: passenger.id,
          passengerId: passenger.id,
          passengerName: passenger.fullName,
          phone: passenger.phone,
          busId: passenger.busId,
          busLabel: buildBusLabel(passenger),
          roundRecords,
          noteByRound,
        };

        return row;
      })
      .filter((row) => {
        if (filters.busIds.length > 0 && (!row.busId || !filters.busIds.includes(row.busId))) {
          return false;
        }

        const isPresent = roundSlots.some((slot) => Boolean(row.roundRecords[slot.id]?.isPresent));
        if (filters.status === 'present' && !isPresent) {
          return false;
        }

        if (filters.status === 'absent' && isPresent) {
          return false;
        }

        if (filters.date) {
          const dateMatch = roundSlots.some((slot) => {
            const record = row.roundRecords[slot.id];
            if (!record?.updatedAt) {
              return false;
            }

            return dayjs(record.updatedAt).isSame(filters.date, 'day');
          });

          if (!dateMatch) {
            return false;
          }
        }

        if (searchLower && !row.passengerName.toLowerCase().includes(searchLower)) {
          return false;
        }

        return true;
      });
  }, [filters, noteDrafts, passengers, recordsByRound, roundSlots]);

  const withSavingKey = async (key: string, callback: () => Promise<void>): Promise<void> => {
    setSavingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));

    try {
      await callback();
    } finally {
      setSavingKeys((prev) => prev.filter((item) => item !== key));
    }
  };

  const onToggleRound = useCallback(
    async (row: AttendanceRow, roundId: string, checked: boolean): Promise<void> => {
      if (!roundSlots.some((slot) => slot.id === roundId)) {
        return;
      }

      await withSavingKey(`${roundId}:${row.passengerId}`, async () => {
        try {
          const existing = row.roundRecords[roundId];
          const noteKey = `${roundId}:${row.passengerId}`;

          const saved = await saveAttendanceApi({
            roundId,
            passengerId: row.passengerId,
            isPresent: checked,
            note: noteDrafts[noteKey] ?? existing?.note ?? '',
          });

          setRecordsByRound((prev) => ({
            ...prev,
            [roundId]: upsertRecord(prev[roundId] ?? [], saved),
          }));
        } catch (error: unknown) {
          message.error(getErrorMessage(error));
        }
      });
    },
    [noteDrafts, roundSlots],
  );

  const onSaveNote = useCallback(
    async (row: AttendanceRow, roundId: string): Promise<void> => {
      if (!roundSlots.some((slot) => slot.id === roundId)) {
        return;
      }

      await withSavingKey(`note:${roundId}:${row.passengerId}`, async () => {
        try {
          const saved = await saveAttendanceApi({
            roundId,
            passengerId: row.passengerId,
            isPresent: row.roundRecords[roundId]?.isPresent ?? false,
            note: row.noteByRound[roundId] ?? '',
          });

          setRecordsByRound((prev) => ({
            ...prev,
            [roundId]: upsertRecord(prev[roundId] ?? [], saved),
          }));

          message.success('Note saved.');
        } catch (error: unknown) {
          message.error(getErrorMessage(error));
        }
      });
    },
    [roundSlots],
  );

  const onChangePassengerBus = useCallback(
    async (row: AttendanceRow, busId: string): Promise<void> => {
      if (!filters.tripId) {
        return;
      }

      await withSavingKey(`bus:${row.passengerId}`, async () => {
        try {
          await updatePassengerApi(row.passengerId, { busId });
          await loadTripData(filters.tripId as string);
          message.success('Passenger bus updated.');
        } catch (error: unknown) {
          message.error(getErrorMessage(error));
        }
      });
    },
    [filters.tripId, loadTripData],
  );

  return {
    filters,
    trips,
    roundSlots,
    busOptions,
    tripBusOptions,
    rows,
    isLoading,
    savingKeys,
    onTripChange: (tripId: string) => {
      setFilters((prev) => ({ ...prev, tripId }));
      void loadTripData(tripId);
    },
    onDateChange: (date: Dayjs | null) => setFilters((prev) => ({ ...prev, date })),
    onBusChange: (busIds: string[]) => setFilters((prev) => ({ ...prev, busIds })),
    onStatusChange: (status: AttendanceStatusFilter) => setFilters((prev) => ({ ...prev, status })),
    onKeywordChange: (value: string) => setFilters((prev) => ({ ...prev, keyword: value })),
    onChangePassengerBus,
    onToggleRound,
    onNoteChange: (passengerId: string, roundId: string, value: string) => {
      setNoteDrafts((prev) => ({ ...prev, [`${roundId}:${passengerId}`]: value }));
    },
    onSaveNote,
    onRefresh: async () => {
      if (filters.tripId) {
        await loadTripData(filters.tripId);
      } else {
        await loadTrips();
      }
    },
  };
};
