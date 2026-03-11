import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  wallet_id: number;

  @Column({ nullable: true })
  type: string;

  @Column('decimal', { nullable: true })
  amount: number;

  @Column({ nullable: true })
  status: string;

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Wallet, wallet => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}
