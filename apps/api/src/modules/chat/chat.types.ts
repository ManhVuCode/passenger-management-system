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
  startDate: string // YYYY-MM-DD
  endDate: string
  roundCount: number
  roundsInProgress: number
  passengerCount: number
  description?: string | null
}

/**
 * PII-light, tenant-scoped snapshot fed to the chat provider. Contains ONLY
 * trip metadata + aggregate counts — NEVER passenger phone/idCard/name/note.
 * Every number here is computed by deterministic tenant-scoped queries so the
 * provider (mock or LLM) only has to phrase it, never compute it.
 */
/** A retrieved knowledge-base chunk (static domain docs — never live/PII data). */
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
  /** RAG: relevant domain-knowledge chunks retrieved for the current question. */
  knowledge?: KnowledgeChunk[]
  generatedAt: string
}

export interface ChatAnswer {
  answer: string
  provider: string
}
