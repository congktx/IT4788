import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reward_rules')
export class RewardRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  battle_type: string | null;

  @Column({ nullable: true })
  label: string | null;

  @Column('decimal', { nullable: true })
  reward_coin: number | null;

  @Column('decimal', { nullable: true })
  min_confidence: number | null;

  @Column('decimal', { nullable: true })
  max_reward_coin: number | null;

  @Column({ default: true })
  is_active: boolean;
}
