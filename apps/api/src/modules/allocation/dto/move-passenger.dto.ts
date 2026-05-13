import { IsUUID } from 'class-validator'

export class MovePassengerDto {
  @IsUUID()
  toBusId!: string
}
