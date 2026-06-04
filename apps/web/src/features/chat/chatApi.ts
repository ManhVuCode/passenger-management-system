import { baseApi } from '../../store/baseApi'

export interface ChatResponse {
  answer: string
  provider: string
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendChat: builder.mutation<ChatResponse, { message: string; lang: string }>({
      query: (body) => ({ url: '/chat', method: 'POST', body }),
    }),
  }),
})

export const { useSendChatMutation } = chatApi
