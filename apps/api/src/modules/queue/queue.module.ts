import { Module, Global } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'

/** Name of the queue that carries async notification-send jobs. */
export const NOTIFICATION_QUEUE = 'notification'

/**
 * Configures the BullMQ root connection from REDIS_URL
 * (default redis://localhost:6379 — see docker-compose `redis` service).
 *
 * Global so the connection is shared; feature modules call
 * `BullModule.registerQueue({ name })` to inject a specific queue.
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
            ...(url.password ? { password: url.password } : {}),
          },
        }
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
