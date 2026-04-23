import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetOrderStatusDto {
  /*@ApiProperty({
    description: 'mã sản phẩm',
  })
  @IsNotEmpty()
  @IsNumber()
  product_id: number;*/
  @ApiProperty({
    description: 'mã đơn hàng',
  })
  @IsNotEmpty()
  @IsNumber()
  purchase_id: number;
}
