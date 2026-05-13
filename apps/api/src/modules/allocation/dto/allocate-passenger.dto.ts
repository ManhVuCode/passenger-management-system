import { IsUUID, IsArray, ArrayMinSize } from 'class-validator'

export class AllocatePassengerDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  passengerIds!: string[]

  @IsUUID()
  busId!: string
}
