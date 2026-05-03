import { IsOptional, IsString } from 'class-validator';

export class ExportAiDatasetDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv';
}
