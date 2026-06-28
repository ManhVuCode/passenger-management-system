import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from './index'
import type { ApiResponse } from '@pms/shared'
import { logout } from '../features/auth/authSlice'

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

    let result = await rawBaseQuery(args, api, extraOptions)

    // Giới hạn tốc độ tạm thời (HTTP 429): lùi dần rồi thử lại vài lần để một loạt
    // query lúc tải trang không hiện thành lỗi/màn rỗng.
    for (let attempt = 0; attempt < 4 && result.error?.status === 429; attempt++) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      result = await rawBaseQuery(args, api, extraOptions)
    }

    // Token hết hạn / bị thu hồi: xóa phiên để ProtectedRoute đưa về trang đăng nhập
    // chung, thay vì hiển thị màn hình "chưa được phân công" gây hiểu nhầm.
    if (result.error?.status === 401) {
      api.dispatch(logout())
    }

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
  tagTypes: ['Assignment', 'Attendance', 'Trip'],
  endpoints: () => ({}),
})
