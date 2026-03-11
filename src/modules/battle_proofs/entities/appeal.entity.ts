import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BattleProof } from './battle_proof.entity';
import { User } from '../../users/entities/user.entity';

@Entity('appeals')
export class Appeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proof_id: number;

  @Column()
  user_id: number;

  @Column('text', { nullable: true })
  reason: string;

  @Column({ nullable: true })
  status: string;

  @ManyToOne(() => BattleProof, bp => bp.appeals)
  @JoinColumn({ name: 'proof_id' })
  proof: BattleProof;

  @ManyToOne(() => User, user => user.appeals)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
