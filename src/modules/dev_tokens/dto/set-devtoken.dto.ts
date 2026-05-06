import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetDevtokenDto {
  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @IsIn(['0', '1'], { message: '1004' })
  devtype: string;

  @IsNotEmpty({ message: '1002' })
  @IsString({ message: '1003' })
  @MinLength(10, { message: '1004' })
  devtoken: string;
}
