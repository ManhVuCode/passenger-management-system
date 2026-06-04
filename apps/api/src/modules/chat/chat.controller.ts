import { Controller, Post, Body } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatQueryDto } from './dto/chat-query.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@pms/shared'

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** Hỏi trợ lý tour. Phạm vi theo tenant qua JWT (R10); chỉ ADMIN. */
  @Post()
  @Roles(Role.ADMIN)
  ask(@Body() dto: ChatQueryDto, @CurrentUser() user: JwtPayload) {
    return this.chat.ask(user.tenantId, dto)
  }
}
