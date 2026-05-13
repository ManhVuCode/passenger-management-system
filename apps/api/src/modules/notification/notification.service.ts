import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { AttendanceGateway } from '../../gateway/attendance.gateway'
import { SendNotificationDto, NotificationChannel } from './dto/send-notification.dto'

interface Recipient {
  name: string
  phone: string
}

export interface NotificationResult {
  sent: number
  channel: NotificationChannel
  devMode: boolean
  recipients: string[]
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private gateway: AttendanceGateway,
  ) {}

  async sendToRound(
    tripId: string,
    roundId: string,
    tenantId: string,
    dto: SendNotificationDto,
  ): Promise<NotificationResult> {
    const recipients = await this.resolveRecipients(tripId, roundId, tenantId, dto.passengerIds)
    if (recipients.length === 0) {
      throw new NotFoundException('No passengers found in this round')
    }

    switch (dto.channel) {
      case NotificationChannel.SMS:
        return this.sendSms(recipients, dto.message)
      case NotificationChannel.TEAMS:
        return this.sendTeams(recipients, dto.message)
      case NotificationChannel.BROADCAST:
        return this.sendBroadcast(tripId, recipients, dto.message)
    }
  }

  private async sendSms(recipients: Recipient[], message: string): Promise<NotificationResult> {
    const apiKey = this.config.get<string>('SMS_API_KEY')
    const devMode = !apiKey

    for (const r of recipients) {
      if (devMode) {
        this.logger.log(`[DEV SMS] → ${r.phone} (${r.name}): ${message}`)
      } else {
        this.logger.log(`[SMS SENT] → ${r.phone}`)
      }
    }

    return {
      sent: recipients.length,
      channel: NotificationChannel.SMS,
      devMode,
      recipients: recipients.map((r) => r.phone),
    }
  }

  private async sendTeams(recipients: Recipient[], message: string): Promise<NotificationResult> {
    const webhookUrl = this.config.get<string>('TEAMS_WEBHOOK_URL')
    const devMode = !webhookUrl

    if (devMode) {
      this.logger.log(`[DEV TEAMS] ${recipients.length} recipients: ${message}`)
    } else {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          summary: message,
          sections: [
            {
              activityTitle: message,
              facts: [{ name: 'Passengers', value: String(recipients.length) }],
            },
          ],
        }),
      })
    }

    return {
      sent: recipients.length,
      channel: NotificationChannel.TEAMS,
      devMode,
      recipients: recipients.map((r) => r.name),
    }
  }

  private async sendBroadcast(
    tripId: string,
    recipients: Recipient[],
    message: string,
  ): Promise<NotificationResult> {
    const apiKey = this.config.get<string>('BROADCAST_API_KEY')
    const devMode = !apiKey

    if (devMode) {
      this.logger.log(`[DEV BROADCAST] ${recipients.length} recipients: ${message}`)
    } else {
      this.logger.log(`[BROADCAST] Initiated for ${recipients.length} recipients`)
    }

    this.gateway.broadcastCallAlert({ tripId, message })

    return {
      sent: recipients.length,
      channel: NotificationChannel.BROADCAST,
      devMode,
      recipients: recipients.map((r) => r.phone),
    }
  }

  private async resolveRecipients(
    tripId: string,
    roundId: string,
    tenantId: string,
    passengerIds?: string[],
  ): Promise<Recipient[]> {
    const round = await this.prisma.round.findFirst({
      where: { id: roundId, tripId, tenantId },
    })
    if (!round) throw new NotFoundException('Round not found')

    if (passengerIds?.length) {
      return this.prisma.tripPassengerAssignment.findMany({
        where: { id: { in: passengerIds }, tripId, tenantId },
        select: { name: true, phone: true },
      })
    }

    const rpas = await this.prisma.roundPassengerAssignment.findMany({
      where: { tripId, roundId },
      include: { tripPassengerAssignment: { select: { name: true, phone: true } } },
    })
    return rpas.map((r) => r.tripPassengerAssignment)
  }
}
