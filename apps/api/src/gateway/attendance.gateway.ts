import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { Logger } from '@nestjs/common'
import { JwtPayload } from '@pms/shared'
import { PrismaService } from '../prisma/prisma.service'

export interface AttendanceUpdatePayload {
  tripId: string
  roundId: string
  busId: string
  passengerId: string
  passengerName: string
  status: string
  markedBy: string
  markedAt: string
}

export interface RoundStatusUpdatePayload {
  tripId: string
  roundId: string
  status: string
}

// Cùng nguồn với CORS của HTTP (main.ts): đọc CORS_ORIGINS để frontend trên Vercel
// bắt tay được WebSocket realtime. Thiếu biến này thì mặc định localhost cho dev.
const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

@WebSocketGateway({
  cors: { origin: corsOrigins, credentials: true },
  namespace: '/attendance',
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server
  private readonly logger = new Logger(AttendanceGateway.name)

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '')

      if (!token) {
        client.disconnect()
        return
      }

      const payload = this.jwt.verify<JwtPayload>(token)
      client.data.user = payload
      this.logger.log(`Client connected: ${client.id} (user: ${payload.userId})`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('join-trip')
  async handleJoinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const user = client.data.user as JwtPayload | undefined
    if (!user) {
      client.disconnect()
      return { error: 'Unauthorized' }
    }

    // Bắt buộc cô lập tenant (domain rule #10): chỉ cho tham gia phòng của trip khi
    // trip thuộc về tenant của người dùng đang kết nối. Nếu thiếu, bất kỳ người dùng
    // đã xác thực nào cũng có thể đăng ký nhận luồng dữ liệu trực tiếp của tenant khác.
    const trip = await this.prisma.trip.findFirst({
      where: { id: data.tripId, tenantId: user.tenantId },
      select: { id: true },
    })
    if (!trip) {
      this.logger.warn(
        `Client ${client.id} denied join to trip ${data.tripId} (cross-tenant)`,
      )
      return { error: 'Forbidden' }
    }

    const room = `trip:${data.tripId}`
    client.join(room)
    this.logger.log(`Client ${client.id} joined room ${room}`)
    return { joined: room }
  }

  @SubscribeMessage('leave-trip')
  handleLeaveTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const room = `trip:${data.tripId}`
    client.leave(room)
    return { left: room }
  }

  broadcastAttendanceUpdate(payload: AttendanceUpdatePayload) {
    const room = `trip:${payload.tripId}`
    this.server?.to(room).emit('attendance:updated', payload)
    this.logger.log(
      `Broadcast attendance update to room ${room}: ${payload.passengerName} → ${payload.status}`,
    )
  }

  broadcastRoundStatusUpdate(data: RoundStatusUpdatePayload) {
    const room = `trip:${data.tripId}`
    this.server?.to(room).emit('round:status-updated', data)
  }

  broadcastCallAlert(data: { tripId: string; message: string }) {
    const room = `trip:${data.tripId}`
    this.server?.to(room).emit('broadcast:call', data)
    this.logger.log(`Broadcast call alert to room ${room}: ${data.message}`)
  }
}
