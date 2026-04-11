import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AuthGuard } from '../../common/auth/guards/auth.guard';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @UseGuards(AuthGuard)
  @Post('create')
  create(
    @Body() body: CreateAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressesService.createAddress(userId, body);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMy(@Req() req: any) {
    const userId = req.user.userId;
    return this.addressesService.getMyAddresses(userId);
  }
}