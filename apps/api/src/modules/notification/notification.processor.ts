import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { NOTIFICATION_QUEUE } from '../queue/queue.module'
import { NotificationSender } from './notification.sender'
import type { SendJobData } from './notification.types'

/**
 * Consumes `send-notification` jobs with concurrency 5 (don't hammer providers).
 * Retry/backoff is configured per-job by the service when it enqueues.
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
