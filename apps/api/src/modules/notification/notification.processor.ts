import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { NOTIFICATION_QUEUE } from '../queue/queue.module'
import { NotificationSender } from './notification.sender'
import type { SendJobData } from './notification.types'

/**
 * Tiêu thụ các job `send-notification` với concurrency 5 (tránh dồn dập provider).
 * Retry/backoff được cấu hình theo từng job bởi service khi đưa vào hàng đợi.
 */
@Processor(NOTIFICATION_QUEUE, { concurrency: 5 })
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly sender: NotificationSender) {
    super()
  }

  async process(job: Job<SendJobData>): Promise<void> {
    await this.sender.deliver(job.data)
  }
}
