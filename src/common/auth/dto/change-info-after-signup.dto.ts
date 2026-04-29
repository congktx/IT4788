import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeInfoAfterSignupDto {
  @IsOptional()
  @IsString({ message: '1003' })
  token?: string;

  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @MinLength(3, { message: '1004' })
  @MaxLength(50, { message: '1004' })
  username: string;

  @IsOptional()
  @IsString({ message: '1003' })
  avatar?: string;
}