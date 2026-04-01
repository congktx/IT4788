import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateCodeResetPasswordDto } from './dto/create-code-reset-password.dto';
import { CheckCodeResetPasswordDto } from './dto/check-code-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeInfoAfterSignupDto } from './dto/change-info-after-signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return {
      code: '1000',
      message: 'OK',
      data: req.user,
    };
  }

  @Post('create_code_reset_password')
  async createCodeResetPassword(@Body() dto: CreateCodeResetPasswordDto) {
    return this.authService.createCodeResetPassword(dto);
  }

  @Post('check_code_reset_password')
  async checkCodeResetPassword(@Body() dto: CheckCodeResetPasswordDto) {
    return this.authService.checkCodeResetPassword(dto);
  }

  @Post('reset_password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change_password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.authService.changePassword(dto, authorization);
  }

  @Post('change_info_after_signup')
  async changeInfoAfterSignup(
    @Body() dto: ChangeInfoAfterSignupDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.authService.changeInfoAfterSignup(dto, authorization);
  }
}
