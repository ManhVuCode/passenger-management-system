import { baseApi } from '../../store/baseApi'

/** Một round được phân công cho tài xế (BUS_MANAGER) — nguồn: GET /me/assignments. */
export interface MyAssignment {
  id: string // roundId
  name: string
  status: string
  departurePoint: string | null
  arrivalPoint: string | null
  scheduledDep: string | null
  scheduledArr: string | null
  operationalNote: string | null
  tripId: string
  trip: { id: string; name: string }
  bus: { id: string; name: string; licensePlate: string; capacity: number }
  busId: string
}

export const meApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyAssignments: builder.query<MyAssignment[], void>({
      query: () => '/me/assignments',
      // Cập nhật khi trạng thái round/điểm danh đổi (dùng chung tag Allocation).
      providesTags: ['Allocation'],
    }),
  }),
})

export const { useGetMyAssignmentsQuery } = meApi
