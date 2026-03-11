import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column()
  user_id: number;

  @Column('text', { nullable: true })
  reason: string;

  @ManyToOne(() => Product, product => product.reports)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, user => user.reports)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
