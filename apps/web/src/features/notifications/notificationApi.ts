import { baseApi } from '../../store/baseApi'

export type NotificationChannel = 'SMS' | 'TEAMS' | 'BROADCAST'

interface SendPayload {
  tripId: string
  roundId: string
  channel: NotificationChannel
  message: string
  passengerIds?: string[]
}

interface NotificationResult {
  sent: number
  channel: NotificationChannel
  devMode: boolean
  recipients: string[]
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendNotification: builder.mutation<NotificationResult, SendPayload>({
      query: ({ tripId, roundId, ...body }) => ({
        url: `/trips/${tripId}/rounds/${roundId}/notify`,
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const { useSendNotificationMutation } = notificationApi
