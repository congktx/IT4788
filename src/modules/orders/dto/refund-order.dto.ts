import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefundOrderDto {
  @IsString()
  @IsNotEmpty()
  purchase_id: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}