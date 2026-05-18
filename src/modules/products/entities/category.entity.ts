import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, default: 0 })
  parent_id: number;

  @Column({ nullable: true, default: 0 })
  sort: number;

  @Column({ nullable: true, default: false })
  has_child: boolean;

  @Column({ nullable: true, default: false })
  has_brand: boolean;

  @Column({ nullable: true, default: false })
  has_size: boolean;

  @Column({ nullable: true, default: false })
  require_weight: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image_url: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}