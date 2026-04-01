import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../modules/users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { User } from '../../modules/users/entities/user.entity';
import { APP_RESPONSE, buildResponse } from '../constants/response.constants';
import { CreateCodeResetPasswordDto } from './dto/create-code-reset-password.dto';
import { RedisService } from '../redis/redis.service';
import { CheckCodeResetPasswordDto } from './dto/check-code-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeInfoAfterSignupDto } from './dto/change-info-after-signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  private buildActive(user: User): number {
    return user.fullname && user.avatar ? 1 : -1;
  }

  private buildLoginResponse(user: User, token: string) {
    return buildResponse(APP_RESPONSE.OK, {
      id: String(user.id),
      username: user.username,
      token,
      avatar: user.avatar,
      active: this.buildActive(user),
    });
  }

  private generateOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min)).toString();
  }

  private buildResetPasswordRedisKey(phoneNumber: string): string {
    return `reset_password:${phoneNumber}`;
  }

  private buildResetPasswordCooldownKey(phoneNumber: string): string {
    return `reset_password_cooldown:${phoneNumber}`;
  }

  private isValidVietnamesePhoneNumber(phoneNumber: string): boolean {
    return /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(phoneNumber);
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    if (phoneNumber.startsWith('+84')) {
      return '0' + phoneNumber.slice(3);
    }
    return phoneNumber;
  }

  private buildResetPasswordVerifiedKey(phoneNumber: string): string {
    return `reset_password_verified:${phoneNumber}`;
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) return null;
  
    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) return null;
  
    return token;
  }

  private isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_. ]{3,50}$/.test(username);
  }

  async signup(signupDto: SignupDto) {
    const existedUser = await this.usersService.findByPhone(
      signupDto.phone_number,
    );

    if (existedUser) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.USER_EXISTED, null),
      );
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = await this.usersService.create({
      phone_number: signupDto.phone_number,
      password: hashedPassword,
      uuid: signupDto.uuid,
      role: 'soldier',
      username: signupDto.phone_number,
    });

    return buildResponse(APP_RESPONSE.OK, {
      id: String(user.id),
      username: user.username,
      avatar: user.avatar,
      active: this.buildActive(user),
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByPhoneWithPassword(
      loginDto.phone_number,
    );

    if (!user) {
      throw new UnauthorizedException(
        buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null),
      );
    }

    let isPasswordMatched = false;
    const isHashedPassword = /^\$2[aby]\$/.test(user.password);

    if (isHashedPassword) {
      isPasswordMatched = await bcrypt.compare(
        loginDto.password,
        user.password,
      );
    } else {
      isPasswordMatched = user.password === loginDto.password;

      if (isPasswordMatched) {
        const newHashedPassword = await bcrypt.hash(loginDto.password, 10);
        await this.usersService.updatePassword(user.id, newHashedPassword);
      }
    }

    if (!isPasswordMatched) {
      throw new UnauthorizedException(
        buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null),
      );
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return this.buildLoginResponse(user, token);
  }

  async createCodeResetPassword(dto: CreateCodeResetPasswordDto) {
    try {
      if (!dto) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      const { phone_number } = dto;

      if (
        phone_number === undefined ||
        phone_number === null ||
        phone_number === ''
      ) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      if (typeof phone_number !== 'string') {
        return buildResponse(APP_RESPONSE.PARAMETER_TYPE_INVALID, null);
      }

      const normalizedPhoneNumber = this.normalizePhoneNumber(
        phone_number.trim(),
      );

      if (!this.isValidVietnamesePhoneNumber(normalizedPhoneNumber)) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }

      const user = await this.usersService.findByPhone(normalizedPhoneNumber);

      if (!user) {
        return buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null);
      }

      // chống spam gửi OTP liên tục trong thời gian ngắn
      const cooldownKey = this.buildResetPasswordCooldownKey(
        normalizedPhoneNumber,
      );
      const existedCooldown = await this.redisService.get(cooldownKey);

      if (existedCooldown) {
        return buildResponse(APP_RESPONSE.SPAM, null);
      }

      const otpLength = Number(process.env.RESET_PASSWORD_OTP_LENGTH);
      const otpTtl = Number(process.env.RESET_PASSWORD_OTP_TTL);
      const otpCooldown = Number(process.env.RESET_PASSWORD_OTP_COOLDOWN);

      const otp = this.generateOtp(otpLength);
      const redisKey = this.buildResetPasswordRedisKey(normalizedPhoneNumber);

      // lưu OTP vào redis
      await this.redisService.set(redisKey, otp, otpTtl);

      // lưu cooldown chống spam
      await this.redisService.set(cooldownKey, '1', otpCooldown);

      // TODO: thay bằng service SMS thật
      await this.mockSendSms(normalizedPhoneNumber, otp);

      return buildResponse(APP_RESPONSE.OK, null);
    } catch (error) {
      console.error('createCodeResetPassword error:', error);
      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }

  async checkCodeResetPassword(dto: CheckCodeResetPasswordDto) {
    const normalizedPhoneNumber = this.normalizePhoneNumber(dto.phone_number);
    const inputCode = dto.reset_code.trim();

    const redisKey = this.buildResetPasswordRedisKey(normalizedPhoneNumber);
    const savedCode = await this.redisService.get(redisKey);

    // Không tồn tại 
    if (!savedCode) {
      return buildResponse(APP_RESPONSE.CODE_VERIFY_INCORRECT, null);
    }

    // Sai mã
    if (savedCode !== inputCode) {
      return buildResponse(APP_RESPONSE.CODE_VERIFY_INCORRECT, null);
    }

    // Đúng mã:
    // xóa OTP cũ để không dùng lại
    await this.redisService.del(redisKey);

    // tạo cờ verified
    const verifiedKey = this.buildResetPasswordVerifiedKey(
      normalizedPhoneNumber,
    );
    const verifiedTtl = Number(process.env.RESET_PASSWORD_VERIFIED_TTL) || 600; // 10 phút

    await this.redisService.set(verifiedKey, '1', verifiedTtl);

    return buildResponse(APP_RESPONSE.OK, null);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const normalizedPhoneNumber = this.normalizePhoneNumber(dto.phone_number);

    const user = await this.usersService.findByPhoneWithPassword(
      normalizedPhoneNumber,
    );

    if (!user) {
      return buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null);
    }

    const verifiedKey = this.buildResetPasswordVerifiedKey(
      normalizedPhoneNumber,
    );
    const isVerified = await this.redisService.get(verifiedKey);

    if (!isVerified) {
      return buildResponse(APP_RESPONSE.CODE_VERIFY_INCORRECT, null);
    }

    const isHashedPassword = /^\$2[aby]\$/.test(user.password);

    if (isHashedPassword) {
      const isSameOldPassword = await bcrypt.compare(
        dto.password,
        user.password,
      );
      if (isSameOldPassword) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }
    } else {
      if (dto.password === user.password) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.usersService.updatePassword(user.id, hashedPassword);

    await this.redisService.del(verifiedKey);

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    const updatedUser = {
      ...user,
      password: hashedPassword,
    };

    return this.buildLoginResponse(updatedUser as User, token);
  }

  async changePassword(
    dto: ChangePasswordDto,
    authorization?: string,
  ) {
    try {
      const headerToken = this.extractBearerToken(authorization);
      const accessToken = headerToken || dto.token;
  
      if (!accessToken) {
        return buildResponse(APP_RESPONSE.TOKEN_INVALID, null);
      }
  
      let payload: any;
  
      try {
        payload = await this.jwtService.verifyAsync(accessToken);
      } catch (error) {
        return buildResponse(APP_RESPONSE.TOKEN_INVALID, null);
      }
  
      const user = await this.usersService.findByIdWithPassword(payload.sub);
  
      if (!user) {
        return buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null);
      }
  
      let isPasswordMatched = false;
      const isHashedPassword = /^\$2[aby]\$/.test(user.password);
  
      if (isHashedPassword) {
        isPasswordMatched = await bcrypt.compare(dto.password, user.password);
      } else {
        isPasswordMatched = user.password === dto.password;
      }
  
      if (!isPasswordMatched) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }
  
      if (dto.password === dto.new_password) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }
  
      if (isHashedPassword) {
        const isSameOldPassword = await bcrypt.compare(
          dto.new_password,
          user.password,
        );
        if (isSameOldPassword) {
          return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
        }
      }
  
      const hashedPassword = await bcrypt.hash(dto.new_password, 10);
      await this.usersService.updatePassword(user.id, hashedPassword);
  
      return buildResponse(APP_RESPONSE.OK, 'OK');
    } catch (error) {
      console.error('changePassword error:', error);
      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }

  async changeInfoAfterSignup(
    dto: ChangeInfoAfterSignupDto,
    authorization?: string,
  ) {
    try {
      const headerToken = this.extractBearerToken(authorization);
      const accessToken = headerToken || dto.token;
  
      if (!accessToken || accessToken.trim().length < 10) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }
  
      let payload: any;
  
      try {
        payload = await this.jwtService.verifyAsync(accessToken);
      } catch (error) {
        return buildResponse(APP_RESPONSE.TOKEN_INVALID, null);
      }
  
      const user = await this.usersService.findById(payload.sub);
  
      if (!user) {
        return buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null);
      }
  
      const username = dto.username.trim();
  
      if (!this.isValidUsername(username)) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }
  
      await this.usersService.updateInfoAfterSignup(user.id, {
        username,
        avatar: dto.avatar ?? user.avatar ?? null,
      });
  
      const updatedUser = await this.usersService.findById(user.id);
      if (!updatedUser) {
        return buildResponse(APP_RESPONSE.USER_NOT_VALIDATED, null);
      }
  
      return buildResponse(APP_RESPONSE.OK, {
        id: String(updatedUser.id),
        username: updatedUser.username,
        phone_number: updatedUser.phone_number,
        password: updatedUser.password,
        uuid: updatedUser.uuid,
        role: updatedUser.role,
        fullname: updatedUser.fullname,
        avatar: updatedUser.avatar,
      });
    } catch (error) {
      console.error('changeInfoAfterSignup error:', error);
      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }

  private async mockSendSms(phoneNumber: string, otp: string) {
    console.log(`[SMS MOCK] Send OTP ${otp} to ${phoneNumber}`);
  }
}
