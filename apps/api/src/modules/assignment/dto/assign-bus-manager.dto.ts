import { IsUUID } from 'class-validator'

export class AssignBusManagerDto {
  @IsUUID()
  userId!: string
}
