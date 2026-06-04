import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IChatProvider } from './chat-provider.interface'
import { MockChatProvider } from './mock.provider'
import { OllamaChatProvider } from './ollama.provider'

/**
 * Resolves CHAT_PROVIDER (MOCK | OLLAMA | GEMINI) to a provider, defaulting to
 * MOCK. GEMINI is a documented future drop-in: register a GeminiChatProvider
 * here and it works with no controller/frontend change. Unknown keys → MOCK.
 */
@Injectable()
export class ChatProviderRegistry {
  private readonly byKey: Record<string, IChatProvider>

  constructor(
    private readonly config: ConfigService,
    mock: MockChatProvider,
    ollama: OllamaChatProvider,
  ) {
    this.byKey = { [mock.key]: mock, [ollama.key]: ollama }
  }

  resolve(): IChatProvider {
    const key = (this.config.get<string>('CHAT_PROVIDER') ?? 'MOCK').toUpperCase()
    return this.byKey[key] ?? this.byKey.MOCK
  }
}
