import { baseApi } from '../../store/baseApi'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBusManagers: builder.query<UserItem[], void>({
      query: () => '/system/tenants/current/users?role=BUS_MANAGER',
      providesTags: ['User'],
    }),
  }),
})

export const { useGetBusManagersQuery } = usersApi
