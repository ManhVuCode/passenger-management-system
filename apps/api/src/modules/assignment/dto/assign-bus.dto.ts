import { IsUUID } from 'class-validator'

export class AssignBusDto {
  @IsUUID()
  busId!: string
}
