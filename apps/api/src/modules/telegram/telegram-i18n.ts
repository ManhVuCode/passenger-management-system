import type { BotLang } from './telegram.types'

/** Chọn ngôn ngữ bot theo language_code của tài khoản Telegram (vi → tiếng Việt, còn lại → English). */
export function pickLang(code?: string): BotLang {
  return code?.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

type Vars = Record<string, string>

function fill(s: string, vars?: Vars): string {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '') : s
}

/**
 * Chuỗi song ngữ cho bot đăng ký. Dùng văn bản thuần (không Markdown) để tên/sđt của
 * khách không làm vỡ định dạng.
 */
const STR = {
  welcome: {
    vi: '👋 Chào mừng bạn đến với bot thông báo chuyến đi!\n\nVui lòng nhập số điện thoại (10 số) bạn đã đăng ký với nhà xe để nhận thông báo.',
    en: '👋 Welcome to the trip notification bot!\n\nPlease enter the phone number (10 digits) you registered with the operator to receive notifications.',
  },
  invalidPhone: {
    vi: '❌ Số điện thoại không hợp lệ. Cần đúng 10 chữ số (vd: 0912345678). Vui lòng nhập lại.',
    en: '❌ Invalid phone number. It must be exactly 10 digits (e.g. 0912345678). Please try again.',
  },
  notFound: {
    vi: '⚠️ Số {phone} chưa có trong danh sách hành khách của nhà xe. Vui lòng kiểm tra lại hoặc liên hệ nhà xe.',
    en: "⚠️ The number {phone} is not in the operator's passenger list. Please check again or contact the operator.",
  },
  linked: {
    vi: '✅ Đã liên kết số {phone} cho {name}.\nBạn sẽ nhận thông báo chuyến đi ngay tại đây.',
    en: '✅ Linked number {phone} for {name}.\nYou will receive trip notifications right here.',
  },
  alreadyUsed: {
    vi: '⚠️ Số {phone} đã được liên kết với một tài khoản Telegram khác.\n\nNếu đây là số của bạn, bấm "Dùng cho tài khoản này" để chuyển sang máy hiện tại; hoặc bấm "Nhập lại" để dùng số khác.',
    en: '⚠️ The number {phone} is already linked to a different Telegram account.\n\nIf this is your number, tap "Use this account" to move it here; or tap "Re-enter" to use another number.',
  },
  relinked: {
    vi: '✅ Đã chuyển số {phone} sang tài khoản này. Bạn sẽ nhận thông báo tại đây.',
    en: '✅ Moved number {phone} to this account. You will receive notifications here.',
  },
  oldChatNotice: {
    vi: 'ℹ️ Số điện thoại {phone} của bạn vừa được đăng ký lại trên một tài khoản Telegram khác. Nếu không phải bạn thực hiện, vui lòng liên hệ nhà xe.',
    en: "ℹ️ Your phone number {phone} has just been re-registered on a different Telegram account. If this wasn't you, please contact the operator.",
  },
  promptAfterReenter: {
    vi: 'Vui lòng nhập lại số điện thoại (10 số).',
    en: 'Please re-enter your phone number (10 digits).',
  },
  help: {
    vi: 'Gửi /start để bắt đầu, hoặc nhập số điện thoại (10 số) bạn đã đăng ký với nhà xe.',
    en: 'Send /start to begin, or enter the phone number (10 digits) you registered with the operator.',
  },
  reenterBtn: { vi: '🔁 Nhập lại số điện thoại', en: '🔁 Re-enter phone number' },
  useHereBtn: { vi: '✅ Dùng cho tài khoản này', en: '✅ Use this account' },
  langBtn: { vi: '🌐 English', en: '🌐 Tiếng Việt' },
} as const

export function t(key: keyof typeof STR, lang: BotLang, vars?: Vars): string {
  return fill(STR[key][lang], vars)
}
