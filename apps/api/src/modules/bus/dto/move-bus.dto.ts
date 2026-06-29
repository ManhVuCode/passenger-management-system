import { IsIn } from 'class-validator'

export class MoveBusDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down'
}
