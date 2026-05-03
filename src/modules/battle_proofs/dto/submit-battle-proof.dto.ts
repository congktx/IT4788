import { IsOptional, IsString } from 'class-validator';

export class SubmitBattleProofDto {
  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
