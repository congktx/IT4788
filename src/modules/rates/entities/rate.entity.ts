import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rates')
export class Rate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  reviewer_id: number;

  @Column({ nullable: true })
  product_id: number;

  @Column({ nullable: true })
  purchase_id: number;

  @Column()
  level: number;

  @Column('text', { nullable: true })
  content: string;

  @CreateDateColumn()
  created_at: Date;
}