import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateBusDto {
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  busCode?: string;

  @IsOptional()
  @IsNumber()
  seatCount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  tripId?: string;
}

