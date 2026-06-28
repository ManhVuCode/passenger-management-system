import { baseApi } from '../../store/baseApi'

export interface TenantRow {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  adminsCount: number
  managersCount: number
}

export interface UserRow {
  id: string
  email: string
  name: string
  phone?: string | null
  role: 'ADMIN' | 'BUS_MANAGER' | 'SYSTEM_ADMIN'
  createdAt: string
  // SystemAdmin xem được (giải mã 2 chiều); null nếu chưa từng đặt qua hệ thống.
  password?: string | null
}

export interface CreateTenantPayload {
  name: string
  slug: string
}

export interface UpdateTenantPayload {
  id: string
  name?: string
  status?: 'ACTIVE' | 'SUSPENDED'
}

export interface CreateUserPayload {
  tenantId: string
  email: string
  name: string
  role: 'ADMIN' | 'BUS_MANAGER'
  password: string
}

export interface UpdateUserPayload {
  tenantId: string
  userId: string
  name?: string
  email?: string
  phone?: string
  role?: 'ADMIN' | 'BUS_MANAGER'
}

export const systemAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query<TenantRow[], void>({
      query: () => '/system/tenants',
      providesTags: ['Tenant'],
    }),
    createTenant: builder.mutation<TenantRow, CreateTenantPayload>({
      query: (body) => ({ url: '/system/tenants', method: 'POST', body }),
      invalidatesTags: ['Tenant'],
    }),
    updateTenant: builder.mutation<TenantRow, UpdateTenantPayload>({
      query: ({ id, ...body }) => ({ url: `/system/tenants/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Tenant'],
    }),
    getTenantUsers: builder.query<UserRow[], string>({
      query: (tenantId) => `/system/tenants/${tenantId}/users`,
      providesTags: (_r, _e, tenantId) => [{ type: 'TenantUser', id: tenantId }],
    }),
    createTenantUser: builder.mutation<UserRow, CreateUserPayload>({
      query: ({ tenantId, ...body }) => ({
        url: `/system/tenants/${tenantId}/users`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { tenantId }) => [{ type: 'TenantUser', id: tenantId }, 'Tenant'],
    }),
    updateTenantUser: builder.mutation<UserRow, UpdateUserPayload>({
      query: ({ tenantId, userId, ...body }) => ({
        url: `/system/tenants/${tenantId}/users/${userId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { tenantId }) => [{ type: 'TenantUser', id: tenantId }, 'Tenant'],
    }),
    resetTenantUserPassword: builder.mutation<
      { success: boolean },
      { tenantId: string; userId: string; password: string }
    >({
      query: ({ tenantId, userId, password }) => ({
        url: `/system/tenants/${tenantId}/users/${userId}/reset-password`,
        method: 'PATCH',
        body: { password },
      }),
      invalidatesTags: (_r, _e, { tenantId }) => [{ type: 'TenantUser', id: tenantId }],
    }),
    removeTenantUser: builder.mutation<void, { tenantId: string; userId: string }>({
      query: ({ tenantId, userId }) => ({
        url: `/system/tenants/${tenantId}/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { tenantId }) => [{ type: 'TenantUser', id: tenantId }, 'Tenant'],
    }),
  }),
})

export const {
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useGetTenantUsersQuery,
  useCreateTenantUserMutation,
  useUpdateTenantUserMutation,
  useResetTenantUserPasswordMutation,
  useRemoveTenantUserMutation,
} = systemAdminApi
