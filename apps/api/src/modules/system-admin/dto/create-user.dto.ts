import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsIn(['ADMIN', 'BUS_MANAGER'])
  role!: 'ADMIN' | 'BUS_MANAGER'

  @IsString()
  @MinLength(6)
  password!: string
}
