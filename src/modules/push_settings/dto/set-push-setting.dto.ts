import { IsIn, IsOptional, IsString } from 'class-validator';

export class SetPushSettingDto {
  @IsOptional()
  @IsString({ message: '1003' })
  token?: string;

  @IsOptional()
  @IsString({ message: '1003' })
  @IsIn(['0', '1'], { message: '1004' })
  like?: string;

  @IsOptional()
  @IsString({ message: '1003' })
  @IsIn(['0', '1'], { message: '1004' })
  comment?: string;

  @IsOptional()
  @IsString({ message: '1003' })
  @IsIn(['0', '1'], { message: '1004' })
  transaction?: string;

  @IsOptional()
  @IsString({ message: '1003' })
  @IsIn(['0', '1'], { message: '1004' })
  announcement?: string;

  @IsOptional()
  @IsString({ message: '1003' })
  @IsIn(['0', '1'], { message: '1004' })
  sound_on?: string;

  @IsOptional()
  @IsString({ message: '1003' })
  sound_default?: string;
}