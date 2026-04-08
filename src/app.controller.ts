import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService, // Thêm dòng này
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('get-test-token')
  async getTestToken() {
    return this.jwtService.sign(
      { sub: 1, username: 'test_user' },
      { secret: this.configService.get<string>('SECRET_KEY') },
    );
  }
}
