import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('saved_searches')
export class SavedSearch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  keyword: string;

  @CreateDateColumn()
  created_at: Date;
}