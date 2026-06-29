import { baseApi } from '../../store/baseApi'

export interface RoundAssignment {
  id: string
  name: string
  status: string
  departurePoint: string | null
  arrivalPoint: string | null
  scheduledDep: string | null
  scheduledArr: string | null
  operationalNote?: string
  tripId: string
  trip: { id: string; name: string }
  bus: { id: string; name: string; licensePlate: string; capacity: number }
  busId: string
}

export interface PaxAttendance {
  id: string
  tripPassengerAssignment: {
    id: string
    name: string
    phone: string | null
    type?: string | null
    note?: string | null
  }
  attendanceRecord: {
    id: string
    status: string
    markedAt: string
    markedBy: string
    note?: string
  } | null
}

export interface AttendanceSummary {
  total: number
  join: number
  absent: number
  cancelled: number
  pending: number
  roundId: string
  operationalNote?: string
}

export interface TripLite {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

export interface RoundLite {
  id: string
  name: string
  sequence: number
  status: string
  departurePoint: string | null
  arrivalPoint: string | null
  scheduledDep: string | null
  scheduledArr: string | null
}

export interface TripWithRounds extends TripLite {
  rounds: RoundLite[]
}

/** Phân bổ hành khách theo round (cho admin xem mọi xe trong 1 chặng). */
export interface RoundAllocation {
  id: string
  busId: string
  tripPassengerAssignment: {
    id: string
    name: string
    phone: string | null
    type?: string | null
    note?: string | null
  }
  roundBusAssignment?: { busId: string; bus: { name: string; licensePlate: string; order?: number } }
  attendanceRecord?: { id: string; status: string } | null
}

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyAssignments: builder.query<RoundAssignment[], void>({
      query: () => '/me/assignments',
      providesTags: ['Assignment'],
    }),
    getTrips: builder.query<TripLite[], void>({
      query: () => '/trips',
      providesTags: ['Trip'],
    }),
    getTrip: builder.query<TripWithRounds, string>({
      query: (id) => `/trips/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Trip', id }],
    }),
    getPassengersForBus: builder.query<
      PaxAttendance[],
      { tripId: string; roundId: string; busId: string }
    >({
      query: ({ tripId, roundId, busId }) =>
        `/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance`,
      providesTags: (_r, _e, { roundId }) => [{ type: 'Attendance', id: roundId }],
    }),
    getAllocationsByRound: builder.query<
      RoundAllocation[],
      { tripId: string; roundId: string }
    >({
      query: ({ tripId, roundId }) => `/trips/${tripId}/rounds/${roundId}/allocations`,
      providesTags: (_r, _e, { roundId }) => [{ type: 'Attendance', id: roundId }],
    }),
    markAttendance: builder.mutation<
      unknown,
      {
        tripId: string
        roundId: string
        busId: string
        rpaIds: string[]
        status: 'JOIN' | 'ABSENT'
        note?: string
      }
    >({
      query: ({ tripId, roundId, busId, rpaIds, status, note }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance`,
        method: 'POST',
        body: { roundPassengerAssignmentIds: rpaIds, status, ...(note && { note }) },
      }),
      // Cập nhật lạc quan cho cả hai nguồn dữ liệu (màn tài xế theo xe + màn admin theo
      // round), để bấm là đổi ngay; vẫn giữ khi offline (service-worker phát lại sau).
      async onQueryStarted(
        { tripId, roundId, busId, rpaIds, status, note },
        { dispatch, queryFulfilled },
      ) {
        const patches = [
          dispatch(
            attendanceApi.util.updateQueryData(
              'getPassengersForBus',
              { tripId, roundId, busId },
              (draft) => {
                for (const p of draft) {
                  if (!rpaIds.includes(p.id)) continue
                  p.attendanceRecord = {
                    id: p.attendanceRecord?.id ?? `optimistic-${p.id}`,
                    status,
                    markedAt: new Date().toISOString(),
                    markedBy: p.attendanceRecord?.markedBy ?? '',
                    note: note ?? p.attendanceRecord?.note,
                  }
                }
              },
            ),
          ),
          dispatch(
            attendanceApi.util.updateQueryData(
              'getAllocationsByRound',
              { tripId, roundId },
              (draft) => {
                for (const a of draft) {
                  if (!rpaIds.includes(a.id)) continue
                  a.attendanceRecord = { id: a.attendanceRecord?.id ?? `optimistic-${a.id}`, status }
                }
              },
            ),
          ),
        ]
        try {
          await queryFulfilled
        } catch (err) {
          const queryStatus = (err as { error?: { status?: unknown } })?.error?.status
          if (queryStatus !== 'FETCH_ERROR' && queryStatus !== 'TIMEOUT_ERROR') {
            patches.forEach((p) => p.undo())
          }
        }
      },
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Attendance', id: roundId }],
    }),
    resetAttendance: builder.mutation<
      unknown,
      { tripId: string; roundId: string; busId: string; rpaIds: string[] }
    >({
      query: ({ tripId, roundId, busId, rpaIds }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance/reset`,
        method: 'POST',
        body: { roundPassengerAssignmentIds: rpaIds },
      }),
      async onQueryStarted({ tripId, roundId, busId, rpaIds }, { dispatch, queryFulfilled }) {
        const patches = [
          dispatch(
            attendanceApi.util.updateQueryData(
              'getPassengersForBus',
              { tripId, roundId, busId },
              (draft) => {
                for (const p of draft) if (rpaIds.includes(p.id)) p.attendanceRecord = null
              },
            ),
          ),
          dispatch(
            attendanceApi.util.updateQueryData(
              'getAllocationsByRound',
              { tripId, roundId },
              (draft) => {
                for (const a of draft) if (rpaIds.includes(a.id)) a.attendanceRecord = null
              },
            ),
          ),
        ]
        try {
          await queryFulfilled
        } catch (err) {
          const queryStatus = (err as { error?: { status?: unknown } })?.error?.status
          if (queryStatus !== 'FETCH_ERROR' && queryStatus !== 'TIMEOUT_ERROR') {
            patches.forEach((p) => p.undo())
          }
        }
      },
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Attendance', id: roundId }],
    }),
    getAttendanceSummary: builder.query<
      AttendanceSummary,
      { tripId: string; roundId: string }
    >({
      query: ({ tripId, roundId }) =>
        `/trips/${tripId}/rounds/${roundId}/attendance/summary`,
      providesTags: (_r, _e, { roundId }) => [{ type: 'Attendance', id: roundId }],
    }),
    updateRoundStatus: builder.mutation<
      unknown,
      { tripId: string; roundId: string; status: string }
    >({
      query: ({ tripId, roundId, status }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_r, _e, { roundId }) => ['Assignment', { type: 'Attendance', id: roundId }],
    }),
  }),
})

export const {
  useGetMyAssignmentsQuery,
  useGetTripsQuery,
  useGetTripQuery,
  useGetPassengersForBusQuery,
  useGetAllocationsByRoundQuery,
  useMarkAttendanceMutation,
  useResetAttendanceMutation,
  useGetAttendanceSummaryQuery,
  useUpdateRoundStatusMutation,
} = attendanceApi
