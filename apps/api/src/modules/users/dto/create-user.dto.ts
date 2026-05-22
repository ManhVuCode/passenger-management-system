import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone?: string

  @IsIn(['ADMIN', 'BUS_MANAGER'])
  role!: 'ADMIN' | 'BUS_MANAGER'

  @IsString()
  @MinLength(6)
  password!: string
}
