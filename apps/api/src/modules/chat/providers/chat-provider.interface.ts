import type { ChatContext, ChatLang } from '../chat.types'

/** Strategy interface: one adapter per chat backend (MOCK | OLLAMA | GEMINI). */
export interface IChatProvider {
  readonly key: string
  /** Answer a question using ONLY the server-built snapshot. Must not compute
   *  or invent counts — every number is already in `context`. */
  answer(question: string, context: ChatContext, lang: ChatLang): Promise<{ answer: string }>
}
