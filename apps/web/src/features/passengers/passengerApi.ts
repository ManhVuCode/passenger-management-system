import { baseApi } from '../../store/baseApi'
import type { TripPassengerAssignment } from '@pms/shared'

type Passenger = TripPassengerAssignment

interface CreatePassengerPayload {
  name: string
  phone: string
  email?: string
  idCard?: string
  type?: string
  note?: string
  hotelRoom?: string
  contactOptOut?: boolean
}

/** Một dòng bị bỏ qua khi import vì SĐT đã thuộc một chuyến giao thời gian. */
export interface BulkSkip {
  name: string
  phone: string
  tripName: string
  dateRange: string
}

export const passengerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPassengers: builder.query<Passenger[], string>({
      query: (tripId) => `/trips/${tripId}/passengers`,
      providesTags: (_r, _e, tripId) => [{ type: 'Passenger', id: tripId }],
    }),
    createPassenger: builder.mutation<Passenger, { tripId: string; body: CreatePassengerPayload }>({
      query: ({ tripId, body }) => ({ url: `/trips/${tripId}/passengers`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { tripId }) => [{ type: 'Passenger', id: tripId }],
    }),
    bulkCreatePassengers: builder.mutation<
      { created: number; passengers: Passenger[]; skipped: BulkSkip[] },
      { tripId: string; passengers: CreatePassengerPayload[] }
    >({
      query: ({ tripId, passengers }) => ({
        url: `/trips/${tripId}/passengers/bulk`,
        method: 'POST',
        body: { passengers },
      }),
      invalidatesTags: (_r, _e, { tripId }) => [{ type: 'Passenger', id: tripId }],
    }),
    updatePassenger: builder.mutation<
      Passenger,
      { id: string; tripId: string; body: Partial<CreatePassengerPayload> }
    >({
      query: ({ id, tripId, body }) => ({
        url: `/trips/${tripId}/passengers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { tripId }) => [{ type: 'Passenger', id: tripId }],
    }),
    deletePassenger: builder.mutation<void, { id: string; tripId: string }>({
      query: ({ id, tripId }) => ({ url: `/trips/${tripId}/passengers/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { tripId }) => [{ type: 'Passenger', id: tripId }],
    }),
  }),
})

export const {
  useGetPassengersQuery,
  useCreatePassengerMutation,
  useBulkCreatePassengersMutation,
  useUpdatePassengerMutation,
  useDeletePassengerMutation,
} = passengerApi
