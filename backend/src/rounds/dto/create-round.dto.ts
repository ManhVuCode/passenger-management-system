import { IsString, IsNotEmpty, IsUUID, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateRoundDto {
  @IsUUID()
  @IsNotEmpty()
  tripId: string; // Chặng này của chuyến nào?

  @IsString()
  @IsNotEmpty()
  name: string; // VD: Chiều đi

  @IsDateString()
  @IsNotEmpty()
  departureTime: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
