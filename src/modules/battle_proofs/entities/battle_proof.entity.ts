import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Appeal } from './appeal.entity';

@Entity('battle_proofs')
export class BattleProof {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  video_url: string | null;

  @Column({ nullable: true })
  image_url: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('decimal', { nullable: true })
  ai_score: number | null;

  @Column('decimal', { nullable: true })
  reward_coin: number | null;

  @Column({ nullable: true })
  battle_type: string | null;

  @Column('decimal', { nullable: true })
  evidence_quality: number | null;

  @Column('decimal', { nullable: true })
  duplicate_risk: number | null;

  @Column('text', { nullable: true })
  ai_reason: string | null;

  @Column({ nullable: true })
  model_version: string | null;

  @Column('text', { nullable: true })
  ai_raw_output: string | null;

  @Column({ nullable: true })
  admin_battle_type: string | null;

  @Column('decimal', { nullable: true })
  admin_evidence_quality: number | null;

  @Column({ nullable: true })
  is_duplicate: boolean | null;

  @Column('decimal', { nullable: true })
  approved_coin: number | null;

  @Column({ nullable: true })
  reviewed_by: number | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column('text', { nullable: true })
  admin_note: string | null;

  @Column({ nullable: true })
  status: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.battle_proofs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Appeal, (appeal) => appeal.proof)
  appeals: Appeal[];
}
