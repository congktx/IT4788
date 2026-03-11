import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversation_id: number;

  @Column()
  sender_id: number;

  @Column('text', { nullable: true })
  content: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ nullable: true })
  video_url: string;

  @Column('int', { nullable: true })
  created_at: number;

  @ManyToOne(() => Conversation, conv => conv.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, user => user.messages_sent)
  @JoinColumn({ name: 'sender_id' })
  sender: User;
}
