import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  
  @Entity('user_blocks')
  @Unique('UQ_user_blocks_blocker_blocked', ['blocker_id', 'blocked_id'])
  @Index('IDX_user_blocks_blocker_id', ['blocker_id'])
  @Index('IDX_user_blocks_blocked_id', ['blocked_id'])
  export class UserBlock {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    blocker_id: number;
  
    @Column()
    blocked_id: number;
  
    @CreateDateColumn()
    created_at: Date;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocker_id' })
    blocker: User;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocked_id' })
    blocked: User;
  }