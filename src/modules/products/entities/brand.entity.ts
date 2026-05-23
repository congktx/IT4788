import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ nullable: true })
  category_id: number;

  @OneToMany(() => Product, (product) => product.brand)
  products: Product[];
}