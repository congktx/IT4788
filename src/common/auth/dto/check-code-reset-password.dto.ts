import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const PHONE_REGEX = /^(0|\+84)[0-9]{9,10}$/;
const OTP_REGEX = /^[0-9]{6}$/;

export class CheckCodeResetPasswordDto {
  @Transform(({ value, obj }) => value ?? obj.phone_number ?? obj.phoneNumber)
  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @Matches(PHONE_REGEX, { message: '1004' })
  phone_number: string;

  @Transform(({ value, obj }) => value ?? obj.resetCode ?? obj.code)
  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @Matches(OTP_REGEX, { message: '1004' })
  reset_code: string;
}