import { Injectable } from '@nestjs/common'
import type { IChatProvider } from './chat-provider.interface'
import type { ChatContext, ChatLang, ChatTripSummary } from '../chat.types'

type StatusKey = 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

/** Chuyển về chữ thường + loại bỏ dấu tiếng Việt để việc so khớp không phân biệt dấu. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
}

/** Giới hạn theo biên từ để 'account'/'discount' (chứa chuỗi con 'count') và 'máy bay'/'may i'
 *  không kích hoạt nhầm; lượng từ tiếng Việt 'may' chỉ được khớp khi đứng trước một danh từ. */
function isCountQuestion(q: string): boolean {
  return /(how many|number of|\bcount\b|bao nhieu|may (chuyen|chang|khach|nguoi)|tong so|so luong)/.test(q)
}

function wantsList(q: string): boolean {
  return /(list|show|liet ke|danh sach|cac chuyen|tat ca chuyen|all tour)/.test(q)
}

/** Nhận diện trạng thái chuyến mà người dùng muốn hỏi. Các cụm PLANNED/DONE/CANCELLED được kiểm tra
 *  trước IN_PROGRESS để "đang lên kế hoạch" không bị khớp nhầm với "đang". */
function detectStatus(q: string): StatusKey | null {
  if (/(planned|upcoming|to come|chua di|chua khoi hanh|sap |sap toi|ke hoach|du kien)/.test(q))
    return 'PLANNED'
  if (/(done|completed|finished|complete|hoan thanh|hoan tat|da xong|ket thuc)/.test(q)) return 'DONE'
  if (/(cancel|huy|bi huy)/.test(q)) return 'CANCELLED'
  if (/(in progress|ongoing|active|running|dang chay|dang dien ra|dang khoi hanh)/.test(q))
    return 'IN_PROGRESS'
  return null
}

function matchTrip(q: string, trips: ChatTripSummary[]): ChatTripSummary | null {
  let best: ChatTripSummary | null = null
  for (const t of trips) {
    const name = normalize(t.name)
    if (name && q.includes(name) && (!best || name.length > normalize(best.name).length)) best = t
  }
  return best
}

const STATUS_LABEL: Record<ChatLang, Record<StatusKey, string>> = {
  en: { PLANNED: 'planned', IN_PROGRESS: 'in progress', DONE: 'done', CANCELLED: 'cancelled' },
  vi: { PLANNED: 'đang lên kế hoạch', IN_PROGRESS: 'đang diễn ra', DONE: 'đã hoàn thành', CANCELLED: 'đã huỷ' },
}

function tripLine(t: ChatTripSummary, lang: ChatLang): string {
  const s = STATUS_LABEL[lang][t.status as StatusKey] ?? t.status
  return lang === 'vi'
    ? `• ${t.name} — ${s}, ${t.roundCount} chặng, ${t.passengerCount} khách`
    : `• ${t.name} — ${s}, ${t.roundCount} round(s), ${t.passengerCount} passenger(s)`
}

function listTours(trips: ChatTripSummary[], lang: ChatLang, status: StatusKey | null): { answer: string } {
  const vi = lang === 'vi'
  if (trips.length === 0) {
    const label = status ? STATUS_LABEL[lang][status] : ''
    return {
      answer: vi
        ? `Không có chuyến nào ${label}.`.replace('  ', ' ')
        : `There are no ${label ? label + ' ' : ''}tours.`,
    }
  }
  const header = status
    ? vi ? `Các chuyến ${STATUS_LABEL.vi[status]}:` : `Your ${STATUS_LABEL.en[status]} tours:`
    : vi ? 'Các chuyến của bạn:' : 'Your tours:'
  return { answer: `${header}\n${trips.map((t) => tripLine(t, lang)).join('\n')}` }
}

/**
 * Provider dựa trên luật, hoạt động xác định, ngoại tuyến, không phân biệt dấu — là mặc định
 * và cũng là phương án dự phòng cho các tầng LLM. Mọi câu trả lời đều được dựng từ mẫu dựa trên
 * snapshot do server tạo, nên các con số đếm là chính xác tuyệt đối. Chuyến được nêu tên cụ thể sẽ
 * được xử lý TRƯỚC một từ trạng thái đơn lẻ, và động từ "list" tường minh được ưu tiên hơn việc
 * đếm theo trạng thái, để "how many passengers on the planned tour X?" và "list
 * planned tours" được định tuyến đúng.
 */
@Injectable()
export class MockChatProvider implements IChatProvider {
  readonly key = 'MOCK'

  async answer(question: string, ctx: ChatContext, lang: ChatLang): Promise<{ answer: string }> {
    const q = normalize(question)
    const vi = lang === 'vi'
    const status = detectStatus(q)
    const wantsCount = isCountQuestion(q)
    const list = wantsList(q)
    const aboutTrips = /(tour|trip|chuyen)/.test(q)
    const aboutPassengers = /(passenger|guest|khach|hanh khach)/.test(q)
    const aboutRounds = /(round|leg|chang|vong)/.test(q)
    const aboutBuses = /(\bbus\b|buses|fleet|doi xe|so xe|may xe)/.test(q)
    const wantsSummary = /(summary|overview|tong quan|tom tat|tinh hinh|tong the|dashboard)/.test(q)
    const wantsNext = /(\bnext\b|soonest|tiep theo|ke tiep)/.test(q)
    const wantsMost = /(most|biggest|largest|dong nhat|nhieu nhat|lon nhat|dong khach)/.test(q)
    const trip = matchTrip(q, ctx.trips)

    // 0) Tổng quan / tóm lược chung
    if (wantsSummary) {
      const c = ctx.statusCounts
      const activeRounds = ctx.trips.reduce((s, t) => s + t.roundsInProgress, 0)
      const pax = ctx.trips.reduce((s, t) => s + t.passengerCount, 0)
      return {
        answer: vi
          ? `Bạn có ${ctx.operatorTripCount} chuyến (${c.PLANNED} lên kế hoạch, ${c.IN_PROGRESS} đang chạy, ${c.DONE} hoàn thành, ${c.CANCELLED} huỷ), ${activeRounds} chặng đang chạy, ${pax} khách trên ${ctx.busCount} xe.`
          : `You have ${ctx.operatorTripCount} tour(s) (${c.PLANNED} planned, ${c.IN_PROGRESS} in progress, ${c.DONE} done, ${c.CANCELLED} cancelled), ${activeRounds} round(s) in progress, ${pax} passenger(s) across ${ctx.busCount} bus(es).`,
      }
    }

    // 1) Các chặng đang diễn ra
    if (aboutRounds && (status === 'IN_PROGRESS' || /progress|dang/.test(q))) {
      const active = ctx.trips.filter((t) => t.roundsInProgress > 0)
      const total = active.reduce((s, t) => s + t.roundsInProgress, 0)
      if (total === 0) return { answer: vi ? 'Hiện không có chặng nào đang diễn ra.' : 'No rounds are currently in progress.' }
      const lines = active.map((t) => `• ${t.name}: ${t.roundsInProgress}`).join('\n')
      return { answer: vi ? `Có ${total} chặng đang diễn ra:\n${lines}` : `${total} round(s) in progress:\n${lines}` }
    }

    // 2) Một chuyến được nêu tên cụ thể — đếm số khách hoặc giới thiệu
    //    (được ưu tiên hơn một từ trạng thái đơn lẻ để "passengers on the planned tour X" trả về đúng)
    if (trip) {
      if (aboutPassengers && wantsCount) {
        return {
          answer: vi
            ? `Chuyến ${trip.name} có ${trip.passengerCount} khách.`
            : `Tour ${trip.name} has ${trip.passengerCount} passenger(s).`,
        }
      }
      const s = STATUS_LABEL[lang][trip.status as StatusKey] ?? trip.status
      const desc = trip.description ? ` ${trip.description}.` : ''
      return {
        answer: vi
          ? `Chuyến ${trip.name} (${trip.startDate} → ${trip.endDate}) hiện ${s}, gồm ${trip.roundCount} chặng và ${trip.passengerCount} khách.${desc}`
          : `Tour ${trip.name} (${trip.startDate} → ${trip.endDate}) is ${s}, with ${trip.roundCount} round(s) and ${trip.passengerCount} passenger(s).${desc}`,
      }
    }

    // 3) Chuyến kế tiếp / sắp tới (chuyến PLANNED khởi hành sớm nhất)
    if (wantsNext && !wantsCount && !list) {
      const upcoming = ctx.trips
        .filter((t) => t.status === 'PLANNED')
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
      if (upcoming.length === 0) return { answer: vi ? 'Hiện không có chuyến nào sắp tới.' : 'There are no upcoming tours.' }
      const n = upcoming[0]
      return {
        answer: vi
          ? `Chuyến sắp tới là ${n.name}, khởi hành ${n.startDate} (${n.roundCount} chặng, ${n.passengerCount} khách).`
          : `Your next tour is ${n.name}, starting ${n.startDate} (${n.roundCount} round(s), ${n.passengerCount} passenger(s)).`,
      }
    }

    // 4) Chuyến có nhiều khách nhất
    if (wantsMost && (aboutPassengers || aboutTrips)) {
      const top = [...ctx.trips].sort((a, b) => b.passengerCount - a.passengerCount)[0]
      if (!top || top.passengerCount === 0) return { answer: vi ? 'Chưa có chuyến nào có khách.' : 'No tour has passengers yet.' }
      return {
        answer: vi
          ? `Chuyến đông khách nhất là ${top.name} với ${top.passengerCount} khách.`
          : `The tour with the most passengers is ${top.name} (${top.passengerCount} passenger(s)).`,
      }
    }

    // 5) Quy mô đội xe
    if (aboutBuses && !aboutPassengers) {
      return { answer: vi ? `Bạn có ${ctx.busCount} xe trong đội.` : `You have ${ctx.busCount} bus(es) in your fleet.` }
    }

    // 6) Động từ "list" tường minh — liệt kê (lọc theo trạng thái nếu có nêu)
    if (list) {
      const subset = status ? ctx.trips.filter((t) => t.status === status) : ctx.trips
      return listTours(subset, lang, status)
    }

    // 4) Tổng số chuyến
    if (wantsCount && aboutTrips && /(total|all|tat ca|tong)/.test(q)) {
      return { answer: vi ? `Bạn đang có tổng cộng ${ctx.operatorTripCount} chuyến.` : `You have ${ctx.operatorTripCount} tour(s) in total.` }
    }

    // 5) Đếm theo trạng thái
    if (status && (wantsCount || aboutTrips)) {
      const n = ctx.statusCounts[status]
      const label = STATUS_LABEL[lang][status]
      return { answer: vi ? `Có ${n} chuyến ${label}.` : `There ${n === 1 ? 'is' : 'are'} ${n} tour(s) ${label}.` }
    }

    // 6) Tổng số khách trên tất cả các chuyến
    if (aboutPassengers && wantsCount) {
      const total = ctx.trips.reduce((s, t) => s + t.passengerCount, 0)
      return { answer: vi ? `Tổng cộng có ${total} khách trên tất cả các chuyến.` : `There are ${total} passenger(s) across all tours.` }
    }

    // 7) Khớp mạnh với cơ sở tri thức → trả lời câu hỏi how/what/why về hệ thống
    if (ctx.knowledge && ctx.knowledge[0] && ctx.knowledge[0].score >= 2) {
      return { answer: ctx.knowledge[0].content }
    }

    // 8) Đề cập chung chung tới "tours" → liệt kê tất cả
    if (aboutTrips) return listTours(ctx.trips, lang, null)

    // 9) Từ trạng thái đơn lẻ → số lượng tương ứng
    if (status) {
      const n = ctx.statusCounts[status]
      return { answer: vi ? `Có ${n} chuyến ${STATUS_LABEL.vi[status]}.` : `There are ${n} tour(s) ${STATUS_LABEL.en[status]}.` }
    }

    // 10) Khớp yếu với cơ sở tri thức → vẫn tốt hơn một câu trả lời chung chung
    if (ctx.knowledge && ctx.knowledge[0]) {
      return { answer: ctx.knowledge[0].content }
    }

    // 11) Phương án dự phòng — liệt kê những gì có thể làm
    return {
      answer: vi
        ? 'Mình có thể trả lời về các chuyến của bạn. Ví dụ: “Có bao nhiêu chuyến đang lên kế hoạch?”, “Liệt kê các chuyến”, “Giới thiệu chuyến hn-hp”, “Chuyến hn-hp có bao nhiêu khách?”.'
        : 'I can answer questions about your tours. Try: “How many tours are planned?”, “List my tours”, “Introduce tour hn-hp”, “How many passengers on tour hn-hp?”.',
    }
  }
}
