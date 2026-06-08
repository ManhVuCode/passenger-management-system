import { Injectable, Logger } from '@nestjs/common'
import type { InlineButton, TgUpdate } from './telegram.types'

/**
 * Lớp gọi Telegram Bot API thuần (stateless). Token được truyền theo từng lần gọi để
 * phục vụ mô hình mỗi nhà xe một bot. Dùng văn bản thuần — không parse_mode.
 */
@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name)

  private base(token: string): string {
    return `https://api.telegram.org/bot${token}`
  }

  /** Long-polling: lấy các update mới kể từ offset. Trả về [] nếu lỗi/timeout. */
  async getUpdates(token: string, offset: number, timeoutSec = 30, signal?: AbortSignal): Promise<TgUpdate[]> {
    const res = await fetch(`${this.base(token)}/getUpdates?offset=${offset}&timeout=${timeoutSec}`, { signal })
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: TgUpdate[] }
    return json.ok && json.result ? json.result : []
  }

  async sendMessage(
    token: string,
    chatId: number | string,
    text: string,
    buttons?: InlineButton[][],
  ): Promise<boolean> {
    try {
      const body: Record<string, unknown> = { chat_id: chatId, text }
      if (buttons) body.reply_markup = { inline_keyboard: buttons }
      const res = await fetch(`${this.base(token)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean }
      return json.ok === true
    } catch (e) {
      this.logger.warn(`sendMessage failed: ${(e as Error).message}`)
      return false
    }
  }

  async answerCallback(token: string, callbackId: string): Promise<void> {
    try {
      await fetch(`${this.base(token)}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId }),
      })
    } catch {
      /* không quan trọng nếu fail */
    }
  }

  /** Đặt mô tả lệnh /start (song ngữ gộp) hiển thị trong app Telegram. */
  async setMyCommands(token: string): Promise<void> {
    try {
      await fetch(`${this.base(token)}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [{ command: 'start', description: 'Đăng ký nhận thông báo · Register for notifications' }],
        }),
      })
    } catch {
      /* bỏ qua */
    }
  }
}
