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
