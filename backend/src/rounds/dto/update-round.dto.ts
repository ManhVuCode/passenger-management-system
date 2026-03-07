import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateRoundDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  departureTime?: string;
}

