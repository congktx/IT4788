import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('likes')
export class Like {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => Product, product => product.likes)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, user => user.likes)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
