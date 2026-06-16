import { IsInt, IsNotEmpty } from 'class-validator';

export class DeleteCartDto {
  @IsInt()
  @IsNotEmpty()
  cart_item_id: number;
}
