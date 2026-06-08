/** Kiểu dữ liệu tối thiểu cho Telegram Bot API (chỉ phần bot đăng ký dùng tới). */
export type BotLang = 'vi' | 'en'

export interface TgUser {
  id: number
  language_code?: string
  first_name?: string
}

export interface TgChat {
  id: number
  type: string
}

export interface TgMessage {
  message_id: number
  from?: TgUser
  chat: TgChat
  text?: string
  contact?: { phone_number: string; user_id?: number }
}

export interface TgCallbackQuery {
  id: string
  from: TgUser
  data?: string
  message?: TgMessage
}

export interface TgUpdate {
  update_id: number
  message?: TgMessage
  callback_query?: TgCallbackQuery
}

export interface InlineButton {
  text: string
  callback_data: string
}
