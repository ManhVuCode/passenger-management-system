import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'
import { CreatePassengerDto } from './create-passenger.dto'

export class BulkCreatePassengerDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePassengerDto)
  passengers!: CreatePassengerDto[]
}
