import type { ChatLang, KnowledgeChunk } from './chat.types'

interface KnowledgeDoc {
  /** Các từ khoá tìm kiếm bổ sung (cả hai ngôn ngữ) để mở rộng phạm vi khớp. */
  keywords: string
  title: { en: string; vi: string }
  body: { en: string; vi: string }
}

/**
 * Cơ sở tri thức song ngữ nhỏ gọn, viết thẳng trong code, mô tả cách hệ thống hoạt động.
 * Giữ trong code (giống như các template tin nhắn) để đóng gói gọn gàng và không cần fs/DB.
 * Việc truy hồi dựa trên từ vựng (độ trùng từ) — hoàn toàn cục bộ, không phụ thuộc gì, chạy được
 * ở cả tier MOCK và OLLAMA. Một bộ truy hồi ngữ nghĩa/embedding (ví dụ Ollama
 * nomic-embed-text) có thể thay thế trực tiếp như một bản nâng cấp tương lai.
 */
const KB: KnowledgeDoc[] = [
  {
    keywords: 'mpms system platform overview multi-tenant operator gioi thieu he thong nha xe',
    title: { en: 'About MPMS', vi: 'Giới thiệu MPMS' },
    body: {
      en: 'MPMS is a multi-tenant platform for tracking passenger attendance on multi-leg tourist bus tours. Each operator (tenant) manages its own tours, buses, drivers and passengers, and data is fully isolated per operator.',
      vi: 'MPMS là nền tảng đa nhà xe để theo dõi điểm danh hành khách trên các chuyến xe du lịch nhiều chặng. Mỗi nhà xe quản lý tour, xe, tài xế và hành khách riêng; dữ liệu tách biệt hoàn toàn theo từng nhà xe.',
    },
  },
  {
    keywords: 'role actor admin busmanager driver system who login account permission vai tro tai xe quan tri dang nhap',
    title: { en: 'Roles', vi: 'Vai trò' },
    body: {
      en: 'There are three staff roles: System Admin (manages operators), Admin (trip coordinator — full CRUD, assigns buses/drivers, can override attendance), and BusManager/driver (marks attendance for their own bus only). Passengers are NOT users: they have no login or account.',
      vi: 'Có ba vai trò nhân viên: System Admin (quản lý nhà xe), Admin (điều phối chuyến — toàn quyền, gán xe/tài xế, có thể ghi đè điểm danh) và BusManager/tài xế (chỉ điểm danh xe của mình). Hành khách KHÔNG phải người dùng: không có tài khoản hay đăng nhập.',
    },
  },
  {
    keywords: 'tour trip round leg status planned in progress done cancelled derived chuyen chang trang thai suy ra',
    title: { en: 'Tours, rounds & status', vi: 'Chuyến, chặng & trạng thái' },
    body: {
      en: 'A tour (Trip) is made of one or more rounds (legs). A round goes PLANNED → IN_PROGRESS → DONE or CANCELLED. A tour status is derived from its rounds: in progress if any round is, done when all are done/cancelled, otherwise planned.',
      vi: 'Một chuyến (Trip) gồm một hay nhiều chặng. Chặng đi theo PLANNED → IN_PROGRESS → DONE hoặc CANCELLED. Trạng thái chuyến được suy ra từ các chặng: đang diễn ra nếu có chặng đang chạy, hoàn thành khi tất cả done/huỷ, còn lại là đang lên kế hoạch.',
    },
  },
  {
    keywords: 'attendance mark join absent cancelled roll call voice check diem danh co mat vang huy',
    title: { en: 'Attendance', vi: 'Điểm danh' },
    body: {
      en: 'Attendance is recorded per passenger per round as JOIN, ABSENT or CANCELLED. Only the BusManager (or an Admin override) sets it — the system never auto-marks. The driver app supports tap, voice check-in, and a read-aloud roll-call. Cancelling a round cascades its attendance to CANCELLED.',
      vi: 'Điểm danh ghi theo từng hành khách mỗi chặng: JOIN (có mặt), ABSENT (vắng) hoặc CANCELLED. Chỉ BusManager (hoặc Admin ghi đè) mới đặt — hệ thống không bao giờ tự điểm danh. App tài xế hỗ trợ chạm, điểm danh bằng giọng nói và đọc tên (roll-call). Huỷ chặng sẽ chuyển toàn bộ điểm danh sang CANCELLED.',
    },
  },
  {
    keywords: 'passenger guest contact phone telegram opt out optout reach data stop hanh khach lien he tu choi',
    title: { en: 'Passengers', vi: 'Hành khách' },
    body: {
      en: 'Passengers are data only (no accounts). They are reached via SMS, Telegram or voice call — never an in-app login. Any passenger can opt out of contact, and opted-out passengers are skipped on every channel.',
      vi: 'Hành khách chỉ là dữ liệu (không có tài khoản). Họ được liên hệ qua SMS, Telegram hoặc gọi thoại — không đăng nhập app. Bất kỳ hành khách nào cũng có thể từ chối nhận liên hệ, và người đã từ chối sẽ bị bỏ qua ở mọi kênh.',
    },
  },
  {
    keywords: 'bus assign driver round capacity move passenger between stop xe gan tai xe suc chua chuyen hanh khach',
    title: { en: 'Buses & assignment', vi: 'Xe & phân công' },
    body: {
      en: 'A bus is assigned to a round (not a whole tour), with one BusManager per bus per round. Admins allocate passengers to buses and can move a passenger between rounds at stops (never mid-round). Over-capacity shows a warning, not a hard block.',
      vi: 'Xe được gán cho từng chặng (không phải cả tour), mỗi xe mỗi chặng có một BusManager. Admin phân hành khách vào xe và có thể chuyển hành khách giữa các chặng tại điểm dừng (không chuyển giữa chặng). Quá tải chỉ cảnh báo, không chặn cứng.',
    },
  },
  {
    keywords: 'notification notifications message messages sms telegram bot voice call teams broadcast automation rule boarding reminder opt out optout consent thong bao gui tin nhan tu dong nhac tu choi',
    title: { en: 'Notifications & automation', vi: 'Thông báo & tự động' },
    body: {
      en: 'Operators can message passengers by SMS, Telegram or voice call, and alert drivers in-app or via Teams. Automation rules can auto-send on round start/cancel/complete plus a boarding reminder; all are off by default and opt-in per operator. Real providers run in mock mode until configured with credentials.',
      vi: 'Nhà xe có thể nhắn hành khách qua SMS, Telegram hoặc gọi thoại, và cảnh báo tài xế trong app hoặc qua Teams. Quy tắc tự động có thể gửi khi chặng khởi hành/huỷ/hoàn thành kèm nhắc giờ lên xe; tất cả mặc định tắt, bật theo từng nhà xe. Nhà cung cấp thật chạy ở chế độ mock cho tới khi được cấu hình.',
    },
  },
]

const STOP = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'of', 'to', 'in', 'on', 'for', 'how', 'what', 'why',
  'can', 'me', 'my', 'and', 'or', 'tell', 'about', 'work', 'works', 'va', 'la', 'co', 'cac', 'mot',
  'cua', 'cho', 'khi', 'nao', 'the', 'gi', 'duoc', 'minh', 'ban',
])

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOP.has(w))
}

// Lập chỉ mục trước cho mỗi doc một lần. Từ trong keyword/title là "mạnh" (trọng số 2); từ trong body
// là "yếu" (trọng số 1) để một keyword đúng chủ đề thắng một lần xuất hiện tình cờ.
const INDEX = KB.map((doc) => ({
  doc,
  strong: new Set(tokenize([doc.keywords, doc.title.en, doc.title.vi].join(' '))),
  body: new Set(tokenize([doc.body.en, doc.body.vi].join(' '))),
}))

/**
 * Truy hồi theo từ vựng: chấm điểm mỗi doc theo độ trùng token của truy vấn (lần khớp keyword/title
 * có trọng số cao hơn lần khớp body), trả về top-k chunk theo ngôn ngữ. Tất định.
 */
export function retrieveKnowledge(query: string, lang: ChatLang, k = 2): KnowledgeChunk[] {
  const qTokens = Array.from(new Set(tokenize(query)))
  if (qTokens.length === 0) return []
  return INDEX.map(({ doc, strong, body }) => ({
    doc,
    score: qTokens.reduce((s, t) => s + (strong.has(t) ? 2 : body.has(t) ? 1 : 0), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ doc, score }) => ({ title: doc.title[lang], content: doc.body[lang], score }))
}
