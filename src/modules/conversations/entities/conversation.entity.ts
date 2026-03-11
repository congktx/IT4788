import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserConversation } from './user_conversation.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { nullable: true })
  time_last_update: number;

  @OneToMany(() => UserConversation, uc => uc.conversation)
  user_conversations: UserConversation[];

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
}
