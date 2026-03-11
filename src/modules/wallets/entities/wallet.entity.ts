import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Transaction } from './transaction.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column('decimal', { nullable: true })
  balance: number;

  @OneToOne(() => User, user => user.wallet)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Transaction, transaction => transaction.wallet)
  transactions: Transaction[];
}
