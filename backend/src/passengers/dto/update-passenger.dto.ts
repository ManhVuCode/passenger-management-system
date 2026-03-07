import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdatePassengerDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  busId?: string;
}

