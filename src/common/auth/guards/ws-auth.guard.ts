import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../../modules/users/users.service';
import { APP_RESPONSE } from '../../constants/response.constants';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'ws') {
      return true;
    }

    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException({
        code: APP_RESPONSE.TOKEN_INVALID.code,
        message: APP_RESPONSE.TOKEN_INVALID.message,
      });
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'dev-secret');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new WsException('User not found');
      }

      client['user'] = {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
      };

    } catch (err) {
      throw new WsException({
        code: APP_RESPONSE.TOKEN_INVALID.code,
        message: APP_RESPONSE.TOKEN_INVALID.message,
      });
    }

    return true;
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // Client (Frontend) cần gửi token khi kết nối: 
    // io('url', { extraHeaders: { Authorization: "Bearer <token>" } })
    const [type, token] = client.handshake.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}