import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<number, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) { }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.jwt_token;
      if (!token) {
        console.log(`[Notification WS] Client ${client.id} bị từ chối do không có token.`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET', 'dev-secret');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      const user = await this.usersService.findById(payload.sub);

      if (user) {
        client['user'] = user;
        this.connectedUsers.set(user.id, client.id);
        console.log(`[Notification WS] User ${user.id} đã kết nối với socket ${client.id}`);
      } else {
        client.disconnect();
      }
    } catch (error) {
      console.log(`[Notification WS] Lỗi xác thực socket ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client['user']?.id;
    if (userId) {
      this.connectedUsers.delete(userId);
      console.log(`[Notification WS] User ${userId} đã ngắt kết nối.`);
    }
  }

  notifyUser(receiverId: number, noti: string, messageData: any) {
    const socketId = this.connectedUsers.get(receiverId);

    if (socketId) {
      this.server.to(socketId).emit(noti, messageData);
    }
  }
}
