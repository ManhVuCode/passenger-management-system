import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IChatProvider } from './chat-provider.interface'
import type { ChatContext, ChatLang } from '../chat.types'
import { MockChatProvider } from './mock.provider'
import { serializeContext, systemPrompt } from './llm-prompt'

/**
 * Open-source LLM backend via a local Ollama server (CHAT_PROVIDER=OLLAMA).
 * Calls /api/chat with native fetch (no SDK). The snapshot is stuffed into the
 * system prompt so the model only phrases server-computed numbers. Any failure
 * (no OLLAMA_URL, timeout, non-200, empty) silently falls back to the mock — so
 * the assistant always answers, accurately, even if the model is down.
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
