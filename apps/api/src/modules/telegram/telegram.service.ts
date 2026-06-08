import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TelegramApiService } from './telegram-api.service'
import { t, pickLang } from './telegram-i18n'
import { normalizePhone } from './phone.util'
import type { BotLang, InlineButton, TgUpdate } from './telegram.types'

interface ConvState {
  lang: BotLang
  pendingPhone?: string // số đang chờ xác nhận "dùng cho tài khoản này" (relink)
}

/**
 * "Bộ não" của bot đăng ký: xử lý /start → hỏi số điện thoại → validate → khớp hành khách
 * theo `phone` (trong phạm vi tenant của bot) → tự lưu `telegramChatId`. Song ngữ vi/en,
 * có nút "Nhập lại", và cảnh báo khi số đã được một tài khoản Telegram khác dùng.
 *
 * Trạng thái hội thoại giữ trong bộ nhớ (đủ cho 1 instance demo; reset khi restart) —
 * việc liên kết thì luôn ghi xuống DB nên không mất.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name)
  private readonly state = new Map<string, ConvState>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: TelegramApiService,
  ) {}

  private getState(tenantId: string, chatId: number, langCode?: string): ConvState {
    const key = `${tenantId}:${chatId}`
    let s = this.state.get(key)
    if (!s) {
      s = { lang: pickLang(langCode) }
      this.state.set(key, s)
    }
    return s
  }

  async handleUpdate(tenantId: string, token: string, update: TgUpdate): Promise<void> {
    if (update.callback_query) return this.handleCallback(tenantId, token, update)
    const msg = update.message
    if (!msg?.chat) return

    const chatId = msg.chat.id
    const st = this.getState(tenantId, chatId, msg.from?.language_code)
    const text = (msg.text ?? msg.contact?.phone_number ?? '').trim()

    if (text === '/start' || text.startsWith('/start ')) {
      st.pendingPhone = undefined
      await this.api.sendMessage(token, chatId, t('welcome', st.lang), [[this.langButton(st.lang)]])
      return
    }
    if (!text) {
      await this.api.sendMessage(token, chatId, t('help', st.lang))
      return
    }
    // Mọi tin nhắn text khác đều coi là một lần thử nhập số điện thoại.
    const phone = normalizePhone(text)
    if (!phone) {
      await this.api.sendMessage(token, chatId, t('invalidPhone', st.lang))
      return
    }
    await this.linkPhone(tenantId, token, chatId, st, phone, false)
  }

  private async handleCallback(tenantId: string, token: string, update: TgUpdate): Promise<void> {
    const cb = update.callback_query!
    await this.api.answerCallback(token, cb.id)
    const chatId = cb.message?.chat.id
    if (chatId == null) return

    const st = this.getState(tenantId, chatId, cb.from.language_code)
    const data = cb.data ?? ''

    if (data === 'reenter') {
      st.pendingPhone = undefined
      await this.api.sendMessage(token, chatId, t('promptAfterReenter', st.lang))
    } else if (data.startsWith('lang:')) {
      st.lang = data.slice(5) === 'vi' ? 'vi' : 'en'
      await this.api.sendMessage(token, chatId, t('welcome', st.lang), [[this.langButton(st.lang)]])
    } else if (data === 'relink' && st.pendingPhone) {
      await this.linkPhone(tenantId, token, chatId, st, st.pendingPhone, true)
    }
  }

  /** Nút chuyển ngôn ngữ: hiển thị ngôn ngữ ĐỐI, callback chuyển sang ngôn ngữ đó. */
  private langButton(lang: BotLang): InlineButton {
    return { text: t('langBtn', lang), callback_data: lang === 'vi' ? 'lang:en' : 'lang:vi' }
  }

  private reenterBtn(lang: BotLang): InlineButton[][] {
    return [[{ text: t('reenterBtn', lang), callback_data: 'reenter' }]]
  }

  /**
   * Khớp số điện thoại với hành khách của tenant và gắn chat_id.
   * `force=true` nghĩa là người dùng đã bấm "Dùng cho tài khoản này" để chuyển số từ một
   * tài khoản Telegram khác sang.
   */
  private async linkPhone(
    tenantId: string,
    token: string,
    chatId: number,
    st: ConvState,
    phone: string,
    force: boolean,
  ): Promise<void> {
    const records = await this.prisma.tripPassengerAssignment.findMany({
      where: { tenantId, phone },
      select: { id: true, name: true, telegramChatId: true },
    })

    if (records.length === 0) {
      await this.api.sendMessage(token, chatId, t('notFound', st.lang, { phone }), this.reenterBtn(st.lang))
      return
    }

    const me = String(chatId)
    const otherChat = records.map((r) => r.telegramChatId).find((c) => c && c !== me) ?? null

    if (otherChat && !force) {
      st.pendingPhone = phone
      await this.api.sendMessage(token, chatId, t('alreadyUsed', st.lang, { phone }), [
        [{ text: t('useHereBtn', st.lang), callback_data: 'relink' }],
        [{ text: t('reenterBtn', st.lang), callback_data: 'reenter' }],
      ])
      return
    }

    await this.prisma.tripPassengerAssignment.updateMany({
      where: { tenantId, phone },
      data: { telegramChatId: me },
    })
    st.pendingPhone = undefined

    if (otherChat) {
      // Đã chuyển từ một tài khoản khác → báo cho tài khoản cũ biết.
      await this.api.sendMessage(token, otherChat, t('oldChatNotice', st.lang, { phone }))
      await this.api.sendMessage(token, chatId, t('relinked', st.lang, { phone }))
    } else {
      await this.api.sendMessage(token, chatId, t('linked', st.lang, { phone, name: records[0].name }), this.reenterBtn(st.lang))
    }
    this.logger.log(`Telegram linked phone=${phone} chat=${me} tenant=${tenantId}`)
  }
}
