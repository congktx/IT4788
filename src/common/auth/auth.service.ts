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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
}
