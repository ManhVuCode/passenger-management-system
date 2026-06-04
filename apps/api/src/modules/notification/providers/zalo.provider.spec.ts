import { ZaloProvider } from './zalo.provider'
import { MockProvider } from './mock.provider'
import type { ConfigService } from '@nestjs/config'

describe('ZaloProvider (D — ZNS with mock default)', () => {
  const mockResult = { success: true, providerId: 'mock-zalo' }
  let mock: MockProvider
  const payload = { to: '84999000111', body: 'Kính mời quý khách lên xe', tenantId: 't1' }

  const make = (env: Record<string, string | undefined>) => {
    mock = { send: jest.fn().mockResolvedValue(mockResult) } as unknown as MockProvider
    const config = { get: (k: string) => env[k] } as unknown as ConfigService
    return new ZaloProvider(config, mock)
  }

  it('defaults to MOCK when ZALO_PROVIDER is unset', async () => {
    const provider = make({})
    const res = await provider.send(payload)
    expect(mock.send).toHaveBeenCalledWith('ZALO', payload)
    expect(res).toEqual(mockResult)
  })

  it('falls back to mock when ZALO_PROVIDER=ZNS but credentials are missing', async () => {
    const provider = make({ ZALO_PROVIDER: 'ZNS' }) // no token / template id
    const res = await provider.send(payload)
    expect(mock.send).toHaveBeenCalledWith('ZALO', payload)
    expect(res).toEqual(mockResult)
  })

  it('attempts a real ZNS call when ZNS is fully configured', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 0, message: 'Success', data: { msg_id: 'zns-1' } }), {
          status: 200,
        }),
      )
    const provider = make({
      ZALO_PROVIDER: 'ZNS',
      ZALO_OA_ACCESS_TOKEN: 'tok',
      ZALO_ZNS_TEMPLATE_ID: 'tmpl-1',
    })

    const res = await provider.send(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://business.openapi.zalo.me/message/template',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(mock.send).not.toHaveBeenCalled()
    expect(res).toEqual({ success: true, providerId: 'zns-1' })
    fetchMock.mockRestore()
  })
})
