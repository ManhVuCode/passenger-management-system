import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  roundId: string;

  @IsUUID()
  @IsNotEmpty()
  passengerId: string;

  @IsBoolean()
  isPresent: boolean; // true/false

  @IsString()
  @IsOptional()
  note?: string;
}