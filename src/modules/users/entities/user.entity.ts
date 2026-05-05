import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  ManyToMany,
} from 'typeorm';
import { UserCode } from './user_code.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { RewardProof } from '../../rewards/entities/reward_proof.entity';
import { RewardAppeal } from '../../rewards/entities/reward_appeal.entity';
import { Product } from '../../products/entities/product.entity';
import { Comment } from '../../products/entities/comment.entity';
import { Like } from '../../products/entities/like.entity';
import { Report } from '../../products/entities/report.entity';
import { Order } from '../../orders/entities/order.entity';
import { Message } from '../../conversations/entities/message.entity';
import { UserFollow } from '../../follow/entities/user-follow.entity';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Address } from '../../orders/entities/address.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'phonenumber', nullable: true })
  phone_number: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  uuid: string;

  @Column({ nullable: true })
  role: string;

  @Column({ name: 'fullName', nullable: true })
  fullname: string;

  @Column({ name: 'firstName', nullable: true })
  firstname: string;

  @Column({ name: 'lastName', nullable: true })
  lastname: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  cover_image: string;

  @Column({ nullable: true })
  cover_image_web: string;

  @Column({ nullable: true })
  avatar: string;

  @Column('text', { nullable: true })
  bio: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => UserCode, (userCode) => userCode.user)
  user_codes: UserCode[];

  @OneToMany(() => RewardProof, (proof) => proof.user)
  reward_proofs: RewardProof[];

  @OneToMany(() => RewardAppeal, (appeal) => appeal.user)
  appeals: RewardAppeal[];

  @OneToMany(() => Product, (product) => product.seller)
  products: Product[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[];

  @OneToMany(() => Report, (report) => report.user)
  reports: Report[];

  @OneToMany(() => Order, (order) => order.buyer)
  orders_bought: Order[];

  @OneToMany(() => Order, (order) => order.seller)
  orders_sold: Order[];

  @ManyToMany(() => Conversation, (conversation) => conversation.users)
  conversations: Conversation[];

  @OneToMany(() => Message, (message) => message.sender)
  messages_sent: Message[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => UserFollow, (follow) => follow.follower)
  following_relations: UserFollow[];

  @OneToMany(() => UserFollow, (follow) => follow.followee)
  follower_relations: UserFollow[];

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];
}