import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { IChatProvider } from './chat-provider.interface'
import { MockChatProvider } from './mock.provider'
import { OllamaChatProvider } from './ollama.provider'

/**
 * Phân giải CHAT_PROVIDER (MOCK | OLLAMA | GEMINI) thành một provider, mặc định là
 * MOCK. GEMINI là phương án bổ sung trong tương lai đã được ghi chú: chỉ cần đăng ký một GeminiChatProvider
 * ở đây là chạy được mà không phải đổi controller/frontend. Key không hợp lệ → MOCK.
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
