import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  
  @Entity('dev_tokens')
  export class DevToken {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Index()
    @Column({ type: 'int' })
    user_id: number;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    // 0: ios, 1: android
    @Column({ type: 'varchar', length: 10 })
    devtype: string;
  
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 512 })
    devtoken: string;
  
    @Column({ type: 'boolean', default: true })
    is_active: boolean;
  
    @CreateDateColumn()
    created_at: Date;
  
    @UpdateDateColumn()
    updated_at: Date;
  }