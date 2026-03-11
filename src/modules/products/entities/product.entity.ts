import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProductVariant } from './product_variant.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { Report } from './report.entity';
import { OrderItem } from '../../orders/entities/order_item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  seller_id: number;

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

  @CreateDateColumn()
  created_at: Date;

  @Column('simple-array', { nullable: true })
  image_urls: string[];

  @ManyToOne(() => User, user => user.products)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => ProductVariant, variant => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => Comment, comment => comment.product)
  comments: Comment[];

  @OneToMany(() => Like, like => like.product)
  likes: Like[];

  @OneToMany(() => Report, report => report.product)
  reports: Report[];

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  order_items: OrderItem[];
}
