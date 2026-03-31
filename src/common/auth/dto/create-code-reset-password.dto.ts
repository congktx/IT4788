import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCodeResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  phone_number: string;
}