import { baseApi } from '../../store/baseApi'

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Đổi mật khẩu của CHÍNH mình — chỉ dùng sau khi đã đăng nhập (cần mật khẩu hiện tại).
    changePassword: builder.mutation<
      { message: string },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),
  }),
})

export const { useChangePasswordMutation } = authApi
