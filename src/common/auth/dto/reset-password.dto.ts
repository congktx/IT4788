import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

const PHONE_REGEX = /^(0|\+84)[0-9]{9,10}$/;

export class ResetPasswordDto {
  @Transform(({ value, obj }) => value ?? obj.phone_number ?? obj.phoneNumber)
  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @Matches(PHONE_REGEX, { message: '1004' })
  phone_number: string;

  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @MinLength(6, { message: '1004' })
  password: string;
}