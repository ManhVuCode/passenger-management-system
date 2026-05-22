import { baseApi } from '../../store/baseApi'

export interface UserItem {
  id: string
  name: string
  email: string
  phone?: string | null
  role: string
  createdAt: string
}

interface CreateUserPayload {
  name: string
  email: string
  phone?: string
  role: 'ADMIN' | 'BUS_MANAGER'
  password: string
}

interface UpdateUserPayload {
  id: string
  name?: string
  email?: string
  phone?: string
  role?: 'ADMIN' | 'BUS_MANAGER'
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBusManagers: builder.query<UserItem[], void>({
      query: () => '/system/tenants/current/users?role=BUS_MANAGER',
      providesTags: ['User'],
    }),
    getUsers: builder.query<UserItem[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: builder.mutation<UserItem, CreateUserPayload>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<UserItem, UpdateUserPayload>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useGetBusManagersQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi
