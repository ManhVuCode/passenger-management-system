import { baseApi } from '../../store/baseApi'

export type NotificationChannel = 'SMS' | 'TEAMS' | 'BROADCAST' | 'IN_APP' | 'ZALO' | 'VOICE'

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
  rsvp: string | null
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
}

export type RsvpIntent = 'WILL_BOARD' | 'WONT_BOARD'

/** C5 — boarding-intent tally over a round's voice calls. */
export interface VoiceIntentSummary {
  total: number
  answered: number
  noAnswer: number
  pending: number
  failed: number
  willBoard: number
  wontBoard: number
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
    getVoiceIntent: builder.query<VoiceIntentSummary, { tripId: string; roundId: string }>({
      query: ({ tripId, roundId }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/notify/intent`,
      }),
      providesTags: ['Notification'],
    }),
    simulateRsvp: builder.mutation<
      NotificationLog,
      { tripId: string; roundId: string; logId: string; rsvp: RsvpIntent }
    >({
      query: ({ tripId, roundId, ...body }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/notify/rsvp`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
})

export const {
  useSendNotificationMutation,
  useGetNotificationHistoryQuery,
  useGetAutoRulesQuery,
  useUpdateAutoRulesMutation,
  useGetVoiceIntentQuery,
  useSimulateRsvpMutation,
} = notificationApi
