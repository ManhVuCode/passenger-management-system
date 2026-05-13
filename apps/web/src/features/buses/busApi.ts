import { baseApi } from '../../store/baseApi'
import type { Bus } from '@pms/shared'

interface CreateBusPayload {
  licensePlate: string
  name: string
  capacity: number
  photoFront: string
  photoSide: string
  photoRear: string
}

export const busApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBuses: builder.query<Bus[], void>({
      query: () => '/buses',
      providesTags: ['Bus'],
    }),
    createBus: builder.mutation<Bus, CreateBusPayload>({
      query: (body) => ({ url: '/buses', method: 'POST', body }),
      invalidatesTags: ['Bus'],
    }),
    deleteBus: builder.mutation<void, string>({
      query: (id) => ({ url: `/buses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Bus'],
    }),
  }),
})

export const { useGetBusesQuery, useCreateBusMutation, useDeleteBusMutation } = busApi
