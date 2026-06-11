import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class EditCartDto {
  @IsInt()
  @IsNotEmpty()
  cart_item_id: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
