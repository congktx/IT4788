import { IsNotEmpty, IsString } from 'class-validator';

export class GetOrderTimelineDto {
  @IsString()
  @IsNotEmpty()
  purchase_id: string;
}