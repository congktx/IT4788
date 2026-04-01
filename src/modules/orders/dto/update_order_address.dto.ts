import { PartialType } from '@nestjs/swagger';
import { AddOrderAddress } from './add_order_address.dto';
export class UpdateOrderAddressDto extends PartialType(AddOrderAddress) {}
