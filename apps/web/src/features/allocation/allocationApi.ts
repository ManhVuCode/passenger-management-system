import { baseApi } from '../../store/baseApi'

export interface RoundPassengerAllocation {
  id: string
  tripPassengerAssignmentId: string
  busId: string
  tripPassengerAssignment: { id: string; name: string; phone: string; type?: string; note?: string }
  roundBusAssignment?: { busId: string; bus: { name: string; licensePlate: string } }
  attendanceRecord?: { id: string; status: string } | null
}

interface AllocateResult {
  assigned: number
  assignments: RoundPassengerAllocation[]
  capacityWarning?: { busId: string; capacity: number; currentCount: number; message: string }
}

export const allocationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllocationsByRound: builder.query<
      RoundPassengerAllocation[],
      { tripId: string; roundId: string }
    >({
      query: ({ tripId, roundId }) => `/trips/${tripId}/rounds/${roundId}/allocations`,
      providesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
    allocatePassengers: builder.mutation<
      AllocateResult,
      { tripId: string; roundId: string; busId: string; passengerIds: string[] }
    >({
      query: ({ tripId, roundId, busId, passengerIds }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/buses/${busId}/allocations`,
        method: 'POST',
        body: { passengerIds, busId },
      }),
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
    movePassenger: builder.mutation<
      unknown,
      { tripId: string; roundId: string; assignmentId: string; toBusId: string }
    >({
      query: ({ tripId, roundId, assignmentId, toBusId }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/allocations/${assignmentId}/move`,
        method: 'PATCH',
        body: { toBusId },
      }),
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
    removeAllocation: builder.mutation<
      void,
      { tripId: string; roundId: string; assignmentId: string }
    >({
      query: ({ tripId, roundId, assignmentId }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/allocations/${assignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
    overrideAttendance: builder.mutation<
      unknown,
      { tripId: string; roundId: string; recordId: string; status: string; note?: string }
    >({
      query: ({ tripId, roundId, recordId, status, note }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/attendance/${recordId}/override`,
        method: 'PATCH',
        body: { status, ...(note && { note }) },
      }),
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
    getRoundBuses: builder.query<
      { busId: string; bus: { id: string; name: string; licensePlate: string; capacity: number } }[],
      { tripId: string; roundId: string }
    >({
      query: ({ tripId, roundId }) => `/trips/${tripId}/rounds/${roundId}/buses`,
      providesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: `buses-${roundId}` }],
    }),
    assignBusToRound: builder.mutation<
      unknown,
      { tripId: string; roundId: string; busId: string }
    >({
      query: ({ tripId, roundId, busId }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/buses`,
        method: 'POST',
        body: { busId },
      }),
      invalidatesTags: (_r, _e, { roundId }) => [
        { type: 'Allocation', id: roundId },
        { type: 'Allocation', id: `buses-${roundId}` },
      ],
    }),
    assignBusManager: builder.mutation<
      unknown,
      { tripId: string; roundId: string; busId: string; userId: string }
    >({
      query: ({ tripId, roundId, busId, userId }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/buses/${busId}/manager`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
  }),
})

export const {
  useGetAllocationsByRoundQuery,
  useAllocatePassengersMutation,
  useMovePassengerMutation,
  useRemoveAllocationMutation,
  useOverrideAttendanceMutation,
  useGetRoundBusesQuery,
  useAssignBusToRoundMutation,
  useAssignBusManagerMutation,
} = allocationApi
