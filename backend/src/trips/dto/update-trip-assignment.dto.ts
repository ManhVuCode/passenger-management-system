import { IsOptional, IsUUID } from 'class-validator';

export class UpdateTripAssignmentDto {
  @IsOptional()
  @IsUUID()
  busId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;
}

