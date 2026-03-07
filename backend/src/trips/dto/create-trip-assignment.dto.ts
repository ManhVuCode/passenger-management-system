import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTripAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  busId: string;

  @IsUUID()
  @IsNotEmpty()
  driverId: string;
}

