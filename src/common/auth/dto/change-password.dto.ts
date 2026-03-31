import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString({ message: '1003' })
  token?: string;

  @Transform(({ value, obj }) => value ?? obj.old_password ?? obj.current_password)
  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  password: string;

  @Transform(({ value, obj }) => value ?? obj.newPassword)
  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @MinLength(6, { message: '1004' })
  new_password: string;
}