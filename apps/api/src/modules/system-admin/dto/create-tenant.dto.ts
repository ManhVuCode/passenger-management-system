import { IsString, IsNotEmpty, Matches } from 'class-validator'

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, or hyphens' })
  slug!: string
}
