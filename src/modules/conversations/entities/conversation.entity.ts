import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Message } from './message.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { nullable: true })
  time_last_update: number;

  @ManyToMany(() => User, (user) => user.conversations)
  @JoinTable()
  users: User[];

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
}
