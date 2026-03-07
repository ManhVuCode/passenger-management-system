import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEmail } from 'class-validator';

export class CreatePassengerDto {
  @IsUUID()
  @IsNotEmpty()
  tripId: string; // Bắt buộc phải có mã chuyến đi

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty() // SĐT nên bắt buộc để còn liên lạc
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  // Nếu muốn xếp khách lên xe ngay lúc tạo thì thêm dòng này
  @IsUUID()
  @IsOptional()
  busId?: string; 
}