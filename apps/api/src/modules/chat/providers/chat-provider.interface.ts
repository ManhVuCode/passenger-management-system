import type { ChatContext, ChatLang } from '../chat.types'

/** Interface theo mẫu Strategy: mỗi chat backend (MOCK | OLLAMA | GEMINI) một adapter. */
export interface IChatProvider {
  readonly key: string
  /** Trả lời câu hỏi CHỈ dựa trên bản chụp dữ liệu do server dựng sẵn. Không được tự tính
   *  hay bịa ra số liệu — mọi con số đã có sẵn trong `context`. */
  answer(question: string, context: ChatContext, lang: ChatLang): Promise<{ answer: string }>
}
