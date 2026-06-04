import { OllamaChatProvider } from './ollama.provider'
import { MockChatProvider } from './mock.provider'
import type { ConfigService } from '@nestjs/config'
import type { ChatContext } from '../chat.types'

const CTX: ChatContext = {
  operatorTripCount: 1,
  busCount: 1,
  statusCounts: { PLANNED: 1, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0 },
  trips: [{ name: 'hn-hp', status: 'PLANNED', startDate: '2026-05-22', endDate: '2026-05-25', roundCount: 1, roundsInProgress: 0, passengerCount: 7 }],
  generatedAt: '2026-06-04T00:00:00.000Z',
}

describe('OllamaChatProvider (LLM with mock fallback)', () => {
  const make = (env: Record<string, string | undefined>) => {
    const config = { get: (k: string) => env[k] } as unknown as ConfigService
    const mock = { key: 'MOCK', answer: jest.fn().mockResolvedValue({ answer: 'MOCK_ANSWER' }) }
    const provider = new OllamaChatProvider(config, mock as unknown as MockChatProvider)
    return { provider, mock }
  }

  it('falls back to mock when OLLAMA_URL is not set', async () => {
    const { provider, mock } = make({})
    const res = await provider.answer('how many tours planned?', CTX, 'en')
    expect(mock.answer).toHaveBeenCalled()
    expect(res.answer).toBe('MOCK_ANSWER')
  })

  it('calls Ollama /api/chat when configured and returns its content', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: { content: 'LLM_ANSWER' } }), { status: 200 }),
    )
    const { provider, mock } = make({ OLLAMA_URL: 'http://localhost:11434', OLLAMA_MODEL: 'llama3.1:8b' })

    const res = await provider.answer('how many tours planned?', CTX, 'en')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(res.answer).toBe('LLM_ANSWER')
    expect(mock.answer).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it('falls back to mock when the Ollama call errors', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const { provider, mock } = make({ OLLAMA_URL: 'http://localhost:11434' })

    const res = await provider.answer('hi', CTX, 'en')

    expect(mock.answer).toHaveBeenCalled()
    expect(res.answer).toBe('MOCK_ANSWER')
    fetchMock.mockRestore()
  })
})
