import { baseApi } from '../../store/baseApi'

export interface RoundPassengerAllocation {
  id: string
  tripPassengerAssignmentId: string
  busId: string
  tripPassengerAssignment: { id: string; name: string; phone: string; type?: string; note?: string }
  roundBusAssignment?: { busId: string; bus: { name: string; licensePlate: string; order?: number } }
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
    // Điểm danh trực tiếp từ màn Live Attendance của admin. Dùng chung endpoint với tài
    // xế (POST .../buses/:busId/attendance) — backend cho ADMIN điểm danh mọi xe và upsert
    // nên áp được cả hành khách chưa có bản ghi (pending → JOIN/ABSENT) lẫn ghi đè.
    markAttendance: builder.mutation<
      { marked: number; status: string },
      {
        tripId: string
        roundId: string
        busId: string
        roundPassengerAssignmentIds: string[]
        status: 'JOIN' | 'ABSENT'
        note?: string
      }
    >({
      query: ({ tripId, roundId, busId, roundPassengerAssignmentIds, status, note }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance`,
        method: 'POST',
        body: { roundPassengerAssignmentIds, status, ...(note && { note }) },
      }),
      // Cập nhật lạc quan: lật trạng thái ngay để bấm có phản hồi tức thì như màn tài xế;
      // hoàn tác nếu server từ chối, rồi invalidate để đồng bộ với sự thật từ server.
      async onQueryStarted(
        { tripId, roundId, roundPassengerAssignmentIds, status },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          allocationApi.util.updateQueryData(
            'getAllocationsByRound',
            { tripId, roundId },
            (draft) => {
              for (const a of draft) {
                if (!roundPassengerAssignmentIds.includes(a.id)) continue
                if (a.attendanceRecord) a.attendanceRecord.status = status
                else a.attendanceRecord = { id: `optimistic-${a.id}`, status }
              }
            },
          ),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
    // Đưa điểm danh về trạng thái chờ (pending) — nút PENDING của bộ gạt 3 trạng thái.
    resetAttendance: builder.mutation<
      { reset: number },
      { tripId: string; roundId: string; busId: string; roundPassengerAssignmentIds: string[] }
    >({
      query: ({ tripId, roundId, busId, roundPassengerAssignmentIds }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/buses/${busId}/attendance/reset`,
        method: 'POST',
        body: { roundPassengerAssignmentIds },
      }),
      async onQueryStarted(
        { tripId, roundId, roundPassengerAssignmentIds },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          allocationApi.util.updateQueryData(
            'getAllocationsByRound',
            { tripId, roundId },
            (draft) => {
              for (const a of draft) {
                if (roundPassengerAssignmentIds.includes(a.id)) a.attendanceRecord = null
              }
            },
          ),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: (_r, _e, { roundId }) => [{ type: 'Allocation', id: roundId }],
    }),
    getRoundBuses: builder.query<
      {
        busId: string
        bus: { id: string; name: string; licensePlate: string; capacity: number }
        busManagerAssignment?: {
          userId: string
          user: { id: string; name: string; email: string }
        } | null
      }[],
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
    getAllRoundAllocations: builder.query<
      {
        roundId: string
        roundName: string
        sequence: number
        departurePoint: string
        arrivalPoint: string
        allocations: {
          tripPassengerAssignmentId: string
          attendanceStatus: string | null
        }[]
      }[],
      string
    >({
      query: (tripId) => `/trips/${tripId}/rounds/allocations-summary`,
      providesTags: (_r, _e, tripId) => [{ type: 'Allocation', id: `summary-${tripId}` }],
    }),
  }),
})

export const {
  useGetAllocationsByRoundQuery,
  useAllocatePassengersMutation,
  useMovePassengerMutation,
  useRemoveAllocationMutation,
  useOverrideAttendanceMutation,
  useMarkAttendanceMutation,
  useResetAttendanceMutation,
  useGetRoundBusesQuery,
  useAssignBusToRoundMutation,
  useAssignBusManagerMutation,
  useGetAllRoundAllocationsQuery,
} = allocationApi
