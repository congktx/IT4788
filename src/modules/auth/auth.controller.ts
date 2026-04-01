import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/jwt-auth.guards';

@Controller('product')
export class ProductController {
  @UseGuards(JwtAuthGuard)
  @Post()
  async checkToken(@Req() req: any) {
    return {
      message: 'Token is valid!',
      userId: req.user.id,
      username: req.user.username,
    };
  }
}
