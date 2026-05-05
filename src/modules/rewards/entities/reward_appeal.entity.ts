import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RewardProof } from './reward_proof.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reward_appeals')
export class RewardAppeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: true })
  reason: string;

  @Column({ nullable: true })
  status: string;

  @ManyToOne(() => RewardProof, bp => bp.appeals)
  @JoinColumn({ name: 'proof_id' })
  proof: RewardProof;

  @ManyToOne(() => User, user => user.appeals)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
