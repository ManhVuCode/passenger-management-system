import { Module, Global } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'

/** Tên của queue chứa các job gửi notification bất đồng bộ. */
export const NOTIFICATION_QUEUE = 'notification'

/**
 * Cấu hình kết nối root của BullMQ từ REDIS_URL
 * (mặc định redis://localhost:6379 — xem service `redis` trong docker-compose).
 *
 * Đặt Global để chia sẻ chung kết nối; các feature module gọi
 * `BullModule.registerQueue({ name })` để inject một queue cụ thể.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379')
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            ...(url.username ? { username: url.username } : {}),
            ...(url.password ? { password: url.password } : {}),
            // rediss:// (Upstash & các Redis có TLS) bắt buộc bật TLS, nếu không sẽ rớt kết nối.
            ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
          },
        }
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
