import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { UserCode } from './user_code.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { BattleProof } from '../../battle_proofs/entities/battle_proof.entity';
import { Appeal } from '../../battle_proofs/entities/appeal.entity';
import { Product } from '../../products/entities/product.entity';
import { Comment } from '../../products/entities/comment.entity';
import { Like } from '../../products/entities/like.entity';
import { Report } from '../../products/entities/report.entity';
import { Order } from '../../orders/entities/order.entity';
import { UserConversation } from '../../conversations/entities/user_conversation.entity';
import { Message } from '../../conversations/entities/message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  phonenumber: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  fullname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column('text', { nullable: true })
  bio: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => Wallet, wallet => wallet.user)
  wallet: Wallet;

  @OneToMany(() => UserCode, userCode => userCode.user)
  user_codes: UserCode[];

  @OneToMany(() => BattleProof, bp => bp.user)
  battle_proofs: BattleProof[];

  @OneToMany(() => Appeal, appeal => appeal.user)
  appeals: Appeal[];

  @OneToMany(() => Product, product => product.seller)
  products: Product[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  @OneToMany(() => Like, like => like.user)
  likes: Like[];

  @OneToMany(() => Report, report => report.user)
  reports: Report[];

  @OneToMany(() => Order, order => order.buyer)
  orders_bought: Order[];

  @OneToMany(() => Order, order => order.seller)
  orders_sold: Order[];

  @OneToMany(() => UserConversation, uc => uc.user)
  user_conversations: UserConversation[];

  @OneToMany(() => Message, message => message.sender)
  messages_sent: Message[];
}
