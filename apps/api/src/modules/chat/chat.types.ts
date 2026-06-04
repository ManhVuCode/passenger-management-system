import type { TripStatus } from '@pms/shared'

export type ChatLang = 'en' | 'vi'

export interface ChatStatusCounts {
  PLANNED: number
  IN_PROGRESS: number
  DONE: number
  CANCELLED: number
}

export interface ChatTripSummary {
  name: string
  status: TripStatus | string
  startDate: string // định dạng YYYY-MM-DD
  endDate: string
  roundCount: number
  roundsInProgress: number
  passengerCount: number
  description?: string | null
}

/**
 * Bản chụp dữ liệu hạn chế PII, giới hạn theo tenant, đưa vào chat provider. CHỈ chứa
 * metadata của trip + các số liệu tổng hợp — KHÔNG BAO GIỜ chứa phone/idCard/name/note của hành khách.
 * Mọi con số ở đây đều được tính bằng các truy vấn tất định giới hạn theo tenant, nên
 * provider (mock hoặc LLM) chỉ việc diễn đạt lại, không bao giờ phải tự tính.
 */
/** Một đoạn (chunk) lấy từ knowledge-base (tài liệu domain tĩnh — không bao giờ là dữ liệu live/PII). */
export interface KnowledgeChunk {
  title: string
  content: string
  score: number
}

export interface ChatContext {
  operatorTripCount: number
  busCount: number
  statusCounts: ChatStatusCounts
  trips: ChatTripSummary[]
  /** RAG: các đoạn kiến thức domain liên quan được lấy về cho câu hỏi hiện tại. */
  knowledge?: KnowledgeChunk[]
  generatedAt: string
}

export interface ChatAnswer {
  answer: string
  provider: string
}
