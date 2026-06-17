import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ProviderRegistry } from './providers/provider.registry'
import type { SendJobData } from './notification.types'

/**
 * Thực hiện một lần gửi và ghi lại kết quả lên dòng NotificationLog đã tồn tại
 * (được service tạo với trạng thái QUEUED). Dùng chung bởi processor BullMQ và
 * nhánh gửi đồng bộ dự phòng, nên hành vi giống nhau dù qua hàng đợi hay inline.
 *
 * Ném lỗi khi provider thất bại để BullMQ retry; dòng log được để ở trạng thái FAILED,
 * đồng thời đóng vai trò bản ghi dead-letter sau lần thử cuối cùng.
 */
@Injectable()
export class NotificationSender {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
  ) {}

  async deliver(data: SendJobData): Promise<void> {
    const provider = this.registry.get(data.channel)
    if (!provider) {
      await this.prisma.notificationLog.update({
        where: { id: data.logId },
        data: { status: 'FAILED', errorReason: 'NO_PROVIDER' },
      })
      return
    }

    const result = await provider.send(data.payload)
    await this.prisma.notificationLog.update({
      where: { id: data.logId },
      data: {
        // Provider có thể báo một trạng thái kết thúc; nếu không thì dùng mặc định
        // success→SENT / failure→FAILED.
        status: result.status ?? (result.success ? 'SENT' : 'FAILED'),
        providerId: result.providerId,
        costMicro: result.costMicro,
        errorReason: result.error,
      },
    })

    if (!result.success) {
      throw new Error(result.error ?? 'send failed')
    }
  }
}
