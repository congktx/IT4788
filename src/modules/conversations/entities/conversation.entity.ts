import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Message } from './message.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  time_last_update: number;

  @Column({ nullable: true })
  time_last_seen: number;

  @Column({ nullable: true })
  last_messasge_id: number;

  @ManyToMany(() => User, (user) => user.conversations)
  @JoinTable()
  users: User[];

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
}
