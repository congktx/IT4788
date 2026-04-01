import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('news')
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: true })
  title: string;

  @Column({ nullable: true })
  created_at: number;
}
