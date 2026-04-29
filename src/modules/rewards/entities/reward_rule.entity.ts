import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reward_rules')
export class RewardRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  battle_type: string;

  @Column('decimal', { nullable: true })
  reward_coin: number;
}
