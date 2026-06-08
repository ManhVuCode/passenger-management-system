import { TelegramProvider } from './telegram.provider'
import { MockProvider } from './mock.provider'
import type { PrismaService } from '../../../prisma/prisma.service'

describe('TelegramProvider (token theo từng nhà xe; mock khi chưa cấu hình)', () => {
  const mockResult = { success: true, providerId: 'mock-telegram' }
  const payload = { to: '123456789', body: 'Kính mời quý khách lên xe', tenantId: 't1' }
  let mock: MockProvider

  const make = (token: string | null) => {
    mock = { send: jest.fn().mockResolvedValue(mockResult) } as unknown as MockProvider
    const prisma = {
      tenantNotificationConfig: {
        findUnique: jest.fn().mockResolvedValue(token ? { telegramBotToken: token } : null),
      },
    } as unknown as PrismaService
    return new TelegramProvider(prisma, mock)
  }

  it('quay về mock khi nhà xe chưa có bot token', async () => {
    const provider = make(null)
    const res = await provider.send(payload)
    expect(mock.send).toHaveBeenCalledWith('TELEGRAM', payload)
    expect(res).toEqual(mockResult)
  })

  it('gửi qua Bot API khi nhà xe đã có token', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 }))
    const provider = make('tok')

    const res = await provider.send(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/bottok/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(mock.send).not.toHaveBeenCalled()
    expect(res).toEqual({ success: true, providerId: '42' })
    fetchMock.mockRestore()
  })
})
