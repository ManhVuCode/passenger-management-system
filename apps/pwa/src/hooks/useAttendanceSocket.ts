import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppSelector } from '../store/hooks'

export interface AttendanceUpdate {
  tripId: string
  roundId: string
  busId: string
  passengerId: string
  passengerName: string
  status: string
  markedBy: string
  markedAt: string
}

export interface RoundStatusUpdate {
  tripId: string
  roundId: string
  status: string
}

interface UseAttendanceSocketOptions {
  tripId: string | undefined
  onAttendanceUpdate?: (data: AttendanceUpdate) => void
  onRoundStatusUpdate?: (data: RoundStatusUpdate) => void
  onBroadcastAlert?: (message: string) => void
}

export function useAttendanceSocket({
  tripId,
  onAttendanceUpdate,
  onRoundStatusUpdate,
  onBroadcastAlert,
}: UseAttendanceSocketOptions) {
  const token = useAppSelector((s) => s.auth.accessToken)
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!tripId || !token) return

    const socket = io(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/attendance`,
      {
        auth: { token },
        transports: ['websocket'],
      },
    )

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join-trip', { tripId })
    })

    socket.on('disconnect', () => setIsConnected(false))

    socket.on('attendance:updated', (data: AttendanceUpdate) => {
      onAttendanceUpdate?.(data)
    })

    socket.on('round:status-updated', (data: RoundStatusUpdate) => {
      onRoundStatusUpdate?.(data)
    })

    socket.on('broadcast:call', (data: { message: string }) => {
      onBroadcastAlert?.(data.message)
    })

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error:', err.message)
      setIsConnected(false)
    })

    return () => {
      socket.emit('leave-trip', { tripId })
      socket.disconnect()
      setIsConnected(false)
    }
  }, [tripId, token, onAttendanceUpdate, onRoundStatusUpdate, onBroadcastAlert])

  return { socket: socketRef, isConnected }
}
