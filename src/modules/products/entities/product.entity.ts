import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProductVariant } from './product_variant.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { Report } from './report.entity';
import { OrderItem } from '../../orders/entities/order_item.entity';
import { Address } from '../../orders/entities/address.entity';
import { Category } from './category.entity';
import { Brand } from './brand.entity';
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  seller_id: number;

  @Column()
  ship_from_id: number;

  @Column({ nullable: true })
  category_id: number;

  @Column({ nullable: true })
  brand_id: number;

  @Column({ nullable: true })
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { nullable: true })
  price: number;

  @Column({ type: 'json', nullable: true })
  videos: { url: string; thumb: string }[];

  @CreateDateColumn()
  created_at: Date;

  @Column('simple-array', { nullable: true })
  image_urls: string[];

  @ManyToOne(() => User, (user) => user.products)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => Comment, (comment) => comment.product)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.product)
  likes: Like[];

  @OneToMany(() => Report, (report) => report.product)
  reports: Report[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  order_items: OrderItem[];

  @ManyToOne(() => Address, (address) => address.products_shipped_from)
  @JoinColumn({ name: 'ship_from_id' })
  ship_from: Address;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Brand, (brand) => brand.products)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;
}
