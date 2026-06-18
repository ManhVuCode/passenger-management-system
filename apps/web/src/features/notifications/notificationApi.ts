import { baseApi } from '../../store/baseApi'

export type NotificationChannel =
  | 'SMS'
  | 'BROADCAST'
  | 'IN_APP'
  | 'TELEGRAM'
  | 'EMAIL'

interface SendPayload {
  tripId: string
  roundId: string
  channel: NotificationChannel
  message: string
  passengerIds?: string[]
}

interface NotificationResult {
  sent: number
  skipped: number
  channel: NotificationChannel
  devMode: boolean
  recipients: string[]
}

export interface NotificationLog {
  id: string
  tripId: string | null
  roundId: string | null
  channel: string
  trigger: string
  templateKey: string | null
  messageText: string
  recipientRef: string | null
  toContact: string | null
  status: string
  providerId: string | null
  errorReason: string | null
  createdAt: string
}

interface HistoryQuery {
  tripId: string
  roundId?: string
  channel?: string
  limit?: number
}

export interface AutoRules {
  roundStarted: boolean
  roundCancelled: boolean
  roundCompleted: boolean
  boardingReminder: boolean
  emailReport: boolean
}

export interface EmailEligibility {
  total: number
  withEmail: number
  withoutEmail: number
}

export interface TelegramConfig {
  configured: boolean
  botUsername: string | null
  registrationLink: string | null
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendNotification: builder.mutation<NotificationResult, SendPayload>({
      query: ({ tripId, roundId, ...body }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/notify`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),
    getNotificationHistory: builder.query<NotificationLog[], HistoryQuery>({
      query: ({ tripId, roundId, channel, limit }) => ({
        url: `/trips/${tripId}/notifications`,
        params: { ...(roundId && { roundId }), ...(channel && { channel }), ...(limit && { limit }) },
      }),
      providesTags: ['Notification'],
    }),
    getAutoRules: builder.query<AutoRules, void>({
      query: () => ({ url: '/notification-config/auto-rules' }),
      providesTags: ['NotificationConfig'],
    }),
    updateAutoRules: builder.mutation<AutoRules, Partial<AutoRules>>({
      query: (body) => ({ url: '/notification-config/auto-rules', method: 'PUT', body }),
      invalidatesTags: ['NotificationConfig'],
    }),
    getEmailEligibility: builder.query<EmailEligibility, { tripId: string; roundId: string }>({
      query: ({ tripId, roundId }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/notify/email-recipients`,
      }),
      providesTags: ['Notification'],
    }),
    getTelegramConfig: builder.query<TelegramConfig, void>({
      query: () => ({ url: '/notification-config/telegram' }),
      providesTags: ['NotificationConfig'],
    }),
    setTelegramConfig: builder.mutation<TelegramConfig, { botToken: string }>({
      query: (body) => ({ url: '/notification-config/telegram', method: 'PUT', body }),
      invalidatesTags: ['NotificationConfig'],
    }),
    clearTelegramConfig: builder.mutation<TelegramConfig, void>({
      query: () => ({ url: '/notification-config/telegram', method: 'DELETE' }),
      invalidatesTags: ['NotificationConfig'],
    }),
  }),
})

export const {
  useSendNotificationMutation,
  useGetNotificationHistoryQuery,
  useGetAutoRulesQuery,
  useUpdateAutoRulesMutation,
  useGetEmailEligibilityQuery,
  useGetTelegramConfigQuery,
  useSetTelegramConfigMutation,
  useClearTelegramConfigMutation,
} = notificationApi
