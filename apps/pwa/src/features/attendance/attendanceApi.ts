import { baseApi } from '../../store/baseApi'

export interface RoundAssignment {
  id: string
  name: string
  status: string
  departurePoint: string
  arrivalPoint: string
  scheduledDep: string
  scheduledArr: string
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
    phone: string
    type?: string
    note?: string
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

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyAssignments: builder.query<RoundAssignment[], void>({
      query: () => '/me/assignments',
      providesTags: ['Assignment'],
    }),
    getPassengersForBus: builder.query<
      PaxAttendance[],
      { tripId: string; roundId: string; busId: string }
    >({
      query: ({ tripId, roundId, busId }) =>
        `/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance`,
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
      // Optimistically reflect the mark so the toggle updates instantly — and
      // stays visible while offline, where the service-worker background-sync
      // queue replays the request on reconnect.
      async onQueryStarted(
        { tripId, roundId, busId, rpaIds, status, note },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
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
        )
        try {
          await queryFulfilled
        } catch (err) {
          // Keep the optimistic state when the request merely failed to reach
          // the server (offline) — it is queued and will sync. Roll back only
          // on a real server rejection (e.g. cancelled round).
          const queryStatus = (err as { error?: { status?: unknown } })?.error?.status
          if (queryStatus !== 'FETCH_ERROR' && queryStatus !== 'TIMEOUT_ERROR') {
            patch.undo()
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
      invalidatesTags: ['Assignment'],
    }),
  }),
})

export const {
  useGetMyAssignmentsQuery,
  useGetPassengersForBusQuery,
  useMarkAttendanceMutation,
  useGetAttendanceSummaryQuery,
  useUpdateRoundStatusMutation,
} = attendanceApi
