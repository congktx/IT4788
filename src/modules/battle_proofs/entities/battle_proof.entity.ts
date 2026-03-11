import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Appeal } from './appeal.entity';

@Entity('battle_proofs')
export class BattleProof {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  video_url: string;

  @Column({ nullable: true })
  image_url: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { nullable: true })
  ai_score: number;

  @Column('decimal', { nullable: true })
  reward_coin: number;

  @Column({ nullable: true })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.battle_proofs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Appeal, appeal => appeal.proof)
  appeals: Appeal[];
}
