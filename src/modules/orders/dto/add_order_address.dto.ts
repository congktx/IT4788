import { ApiProperty } from '@nestjs/swagger';

export class AddOrderAddress {
  @ApiProperty({ description: 'địa chỉ chi tiết' })
  address: string;

  @ApiProperty({ description: 'đánh dấu địa chỉ mặc định' })
  is_default: boolean = false;

  @ApiProperty({
    description: 'mảng các id, 0-ward_id, 1-province_id',
    example: '[1,2]',
  })
  address_id: number[];

  @ApiProperty({ description: 'Vĩ độ' })
  lat: number;

  @ApiProperty({ description: 'Kinh độ' })
  lng: number;

  @ApiProperty({ description: 'Họ và tên người nhận' })
  receiver_name: string;

  @ApiProperty({ description: 'Số điện thoại' })
  phone: string;

  @ApiProperty({ description: 'cả địa chỉ' })
  full_address: string;

  @ApiProperty({ description: 'address detail' })
  address_detail: string;
}