import { baseApi } from '../../store/baseApi'
import type { Trip } from '@pms/shared'

interface CreateTripPayload {
  name: string
  description?: string
  startDate: string
  endDate: string
}

export const tripsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrips: builder.query<Trip[], void>({
      query: () => '/trips',
      providesTags: ['Trip'],
    }),
    getTrip: builder.query<Trip, string>({
      query: (id) => `/trips/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Trip', id }],
    }),
    createTrip: builder.mutation<Trip, CreateTripPayload>({
      query: (body) => ({ url: '/trips', method: 'POST', body }),
      invalidatesTags: ['Trip'],
    }),
    updateTrip: builder.mutation<Trip, { id: string; body: Partial<CreateTripPayload> }>({
      query: ({ id, body }) => ({ url: `/trips/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Trip'],
    }),
    deleteTrip: builder.mutation<void, string>({
      query: (id) => ({ url: `/trips/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Trip'],
    }),
  }),
})

export const {
  useGetTripsQuery,
  useGetTripQuery,
  useCreateTripMutation,
  useUpdateTripMutation,
  useDeleteTripMutation,
} = tripsApi
