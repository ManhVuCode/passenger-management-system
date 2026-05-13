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

@WebSocketGateway({
  cors: { origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true },
  namespace: '/attendance',
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server
  private readonly logger = new Logger(AttendanceGateway.name)

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '')

      if (!token) {
        client.disconnect()
        return
      }

      const payload = this.jwt.verify(token)
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
  handleJoinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
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
}
