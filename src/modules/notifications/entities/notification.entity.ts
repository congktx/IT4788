import { User } from "../../../modules/users/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  product_id: number;

  @Column()
  title: string;

  @Column()
  created_at: number;

  @Column()
  avatar: string;

  @Column()
  group: number;

  @Column()
  read: boolean;

  @ManyToOne(() => User, user => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;
}