import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from './index'
import type { ApiResponse } from '@pms/shared'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: async (args, api, extraOptions) => {
    const rawBaseQuery = fetchBaseQuery({
      baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
      prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return headers
      },
    })

    const result = await rawBaseQuery(args, api, extraOptions)

    if (result.data) {
      const wrapped = result.data as ApiResponse<unknown>
      if ('success' in wrapped && 'code' in wrapped) {
        if (!wrapped.success) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: wrapped.message,
              data: { message: wrapped.message, code: wrapped.code },
            },
          }
        }
        return { data: wrapped.data }
      }
    }

    return result
  },
  tagTypes: ['Assignment', 'Attendance'],
  endpoints: () => ({}),
})
