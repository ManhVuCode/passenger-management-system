import { baseApi } from '../../store/baseApi'
import type { Trip, Round } from '@pms/shared'

export type TripWithRounds = Trip & { rounds: Round[] }

interface CreateTripPayload {
  name: string
  description?: string
  startDate: string
  endDate: string
}

interface CreateRoundPayload {
  name: string
  sequence: number
  departurePoint: string
  arrivalPoint: string
  scheduledDep: string
  scheduledArr: string
}

export const tripsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrips: builder.query<Trip[], void>({
      query: () => '/trips',
      providesTags: ['Trip'],
    }),
    getTrip: builder.query<TripWithRounds, string>({
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
    createRound: builder.mutation<Round, { tripId: string; body: CreateRoundPayload }>({
      query: ({ tripId, body }) => ({
        url: `/trips/${tripId}/rounds`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { tripId }) => [{ type: 'Trip', id: tripId }],
    }),
    updateRoundStatus: builder.mutation<
      Round,
      { tripId: string; roundId: string; status: string }
    >({
      query: ({ tripId, roundId, status }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_r, _e, { tripId }) => [{ type: 'Trip', id: tripId }],
    }),
  }),
})

export const {
  useGetTripsQuery,
  useGetTripQuery,
  useCreateTripMutation,
  useUpdateTripMutation,
  useDeleteTripMutation,
  useCreateRoundMutation,
  useUpdateRoundStatusMutation,
} = tripsApi
