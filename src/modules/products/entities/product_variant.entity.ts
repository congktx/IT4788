import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  color: string;

  @Column('int', { nullable: true })
  stock: number;

  @ManyToOne(() => Product, product => product.variants)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
