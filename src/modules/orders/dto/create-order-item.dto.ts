import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  product_id: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  address_id: number;

  // Theo đặc tả:
  // 0 = tạo đơn từ giỏ hàng
  // 1 = tạo đơn trực tiếp từ sản phẩm
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  order_source: number;

  // Giữ lại để không vỡ nếu FE/mobile cũ vẫn gửi source
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  source?: number;
}
