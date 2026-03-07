import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateBusDto {
  @IsString()
  @IsNotEmpty()
  licensePlate: string; // Biển số là bắt buộc

  @IsNumber()
  @IsOptional()
  seatCount?: number;

  @IsUUID()
  @IsOptional()
  tripId?: string; // Có thể null (nếu chỉ tạo để nhập kho)

  @IsString()
  @IsOptional()
  busCode?: string;

  @IsString()
  @IsOptional()
  driverName?: string;

  // ... các trường khác tùy ý
}