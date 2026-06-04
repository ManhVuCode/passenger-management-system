import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IChatProvider } from './chat-provider.interface'
import type { ChatContext, ChatLang } from '../chat.types'
import { MockChatProvider } from './mock.provider'
import { serializeContext, systemPrompt } from './llm-prompt'

/**
 * Backend LLM mã nguồn mở thông qua một server Ollama chạy cục bộ (CHAT_PROVIDER=OLLAMA).
 * Gọi /api/chat bằng fetch gốc (không dùng SDK). Snapshot được nhồi vào system prompt
 * để mô hình chỉ diễn đạt thành câu các con số do server tính sẵn. Mọi lỗi
 * (thiếu OLLAMA_URL, timeout, mã không phải 200, rỗng) đều âm thầm quay về dùng mock — nhờ đó
 * trợ lý luôn trả lời chính xác, kể cả khi mô hình ngừng hoạt động.
 */
@Injectable()
export class OllamaChatProvider implements IChatProvider {
  readonly key = 'OLLAMA'
  private readonly logger = new Logger(OllamaChatProvider.name)

  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockChatProvider,
  ) {}

  async answer(question: string, context: ChatContext, lang: ChatLang): Promise<{ answer: string }> {
    const url = this.config.get<string>('OLLAMA_URL')
    if (!url) {
      this.logger.warn('OLLAMA_URL not set — using mock')
      return this.mock.answer(question, context, lang)
    }
    const model = this.config.get<string>('OLLAMA_MODEL') ?? 'llama3.1:8b'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature: 0.2 },
          messages: [
            { role: 'system', content: `${systemPrompt(lang)}\n\nDATA:\n${serializeContext(context)}` },
            { role: 'user', content: question },
          ],
        }),
      })
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
      const json = (await res.json()) as { message?: { content?: string } }
      const answer = json.message?.content?.trim()
      if (!answer) throw new Error('empty response')
      return { answer }
    } catch (e) {
      this.logger.warn(`Ollama failed (${(e as Error).message}) — using mock`)
      return this.mock.answer(question, context, lang)
    } finally {
      clearTimeout(timer)
    }
  }
}
