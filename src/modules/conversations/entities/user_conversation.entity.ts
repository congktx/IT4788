import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('user_conversations')
export class UserConversation {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  conversation_id: number;

  @ManyToOne(() => User, user => user.user_conversations)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Conversation, conv => conv.user_conversations)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
