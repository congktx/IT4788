import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../../common/auth/guards/ws-auth.guard';

@WebSocketGateway({ cors: true, namespace: 'conversations' })
export class ConversationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<number, string>();

  @UseGuards(WsAuthGuard)
  handleConnection(client: Socket) {
    const userId = client['user']?.id;
    if (userId) {
      this.connectedUsers.set(userId, client.id);
    }
  }

  notifyUser(receiverId: number, noti: string, messageData: any) {
    const socketId = this.connectedUsers.get(receiverId);

    if (socketId) {
      this.server.to(socketId).emit(noti, messageData);
    }
  }
}