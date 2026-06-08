import { TelegramService } from './telegram.service'
import type { TelegramApiService } from './telegram-api.service'
import type { PrismaService } from '../../prisma/prisma.service'
import type { TgUpdate } from './telegram.types'

function msg(text: string, chatId = 111, lang = 'vi'): TgUpdate {
  return {
    update_id: 1,
    message: { message_id: 1, chat: { id: chatId, type: 'private' }, from: { id: 9, language_code: lang }, text },
  }
}

describe('TelegramService (bot đăng ký — liên kết số điện thoại)', () => {
  const TOKEN = 'tok'
  const TENANT = 't1'
  let findMany: jest.Mock
  let updateMany: jest.Mock
  let send: jest.Mock
  let svc: TelegramService

  beforeEach(() => {
    findMany = jest.fn()
    updateMany = jest.fn().mockResolvedValue({ count: 1 })
    send = jest.fn().mockResolvedValue(true)
    const prisma = { tripPassengerAssignment: { findMany, updateMany } } as unknown as PrismaService
    const api = { sendMessage: send, answerCallback: jest.fn() } as unknown as TelegramApiService
    svc = new TelegramService(prisma, api)
  })

  it('/start hỏi số điện thoại', async () => {
    await svc.handleUpdate(TENANT, TOKEN, msg('/start'))
    expect(send.mock.calls[0][2]).toContain('số điện thoại')
  })

  it('từ chối số điện thoại sai định dạng', async () => {
    await svc.handleUpdate(TENANT, TOKEN, msg('hello'))
    expect(send.mock.calls[0][2]).toContain('không hợp lệ')
    expect(findMany).not.toHaveBeenCalled()
  })

  it('báo khi số chưa có trong danh sách hành khách', async () => {
    findMany.mockResolvedValue([])
    await svc.handleUpdate(TENANT, TOKEN, msg('0912345678'))
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: TENANT, phone: '0912345678' } }))
    expect(send.mock.calls[0][2]).toContain('chưa có trong danh sách')
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('gắn chat_id vào hành khách khớp số', async () => {
    findMany.mockResolvedValue([{ id: 'p1', name: 'Nguyen Van A', telegramChatId: null }])
    await svc.handleUpdate(TENANT, TOKEN, msg('0912345678', 111))
    expect(updateMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, phone: '0912345678' },
      data: { telegramChatId: '111' },
    })
    expect(send.mock.calls[0][2]).toContain('Đã liên kết')
  })

  it('cảnh báo khi số đã gắn với một chat khác', async () => {
    findMany.mockResolvedValue([{ id: 'p1', name: 'A', telegramChatId: '999' }])
    await svc.handleUpdate(TENANT, TOKEN, msg('0912345678', 111))
    expect(updateMany).not.toHaveBeenCalled()
    expect(send.mock.calls[0][2]).toContain('tài khoản Telegram khác')
  })

  it('chuẩn hoá +84 về dạng 0xxxxxxxxx', async () => {
    findMany.mockResolvedValue([{ id: 'p1', name: 'A', telegramChatId: null }])
    await svc.handleUpdate(TENANT, TOKEN, msg('+84 912 345 678', 111))
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: TENANT, phone: '0912345678' } }))
  })
})
