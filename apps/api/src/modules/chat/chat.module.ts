import { Module } from '@nestjs/common'
import { TripModule } from '../trip/trip.module'
import { PassengerModule } from '../passenger/passenger.module'
import { BusModule } from '../bus/bus.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatProviderRegistry } from './providers/chat-provider.registry'
import { MockChatProvider } from './providers/mock.provider'
import { OllamaChatProvider } from './providers/ollama.provider'

@Module({
  imports: [TripModule, PassengerModule, BusModule],
  controllers: [ChatController],
  providers: [ChatService, ChatProviderRegistry, MockChatProvider, OllamaChatProvider],
})
export class ChatModule {}
