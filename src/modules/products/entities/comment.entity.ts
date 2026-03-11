import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column()
  user_id: number;

  @Column('text', { nullable: true })
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Product, product => product.comments)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, user => user.comments)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
