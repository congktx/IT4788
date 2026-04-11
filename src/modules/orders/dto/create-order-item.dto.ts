import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  product_id: number;

  @IsInt()
  @Min(1)
  quantity: number;
}