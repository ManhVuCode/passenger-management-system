import { IsString, IsNotEmpty } from 'class-validator'

export class RoundNoteDto {
  @IsString()
  @IsNotEmpty()
  note!: string
}
