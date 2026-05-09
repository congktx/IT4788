import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { HttpCode } from '@nestjs/common';
@ApiBearerAuth("JWT-auth")
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) { }

  @UseGuards(AuthGuard)
  @Post('create')
  @HttpCode(200)
  create(
    @Body() body: any,
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