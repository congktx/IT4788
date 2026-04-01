import { IsOptional, IsString } from 'class-validator';

export class GetPushSettingDto {
  @IsOptional()
  @IsString({ message: '1003' })
  token?: string;
}