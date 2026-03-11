import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order_item.entity';
import { Shipping } from './shipping.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  buyer_id: number;

  @Column()
  seller_id: number;

  @Column({ nullable: true })
  status: string;

  @Column('decimal', { nullable: true })
  total_price: number;

  @Column('decimal', { nullable: true })
  shipping_fee: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.orders_bought)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @ManyToOne(() => User, user => user.orders_sold)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  items: OrderItem[];

  @OneToOne(() => Shipping, shipping => shipping.order)
  shipping: Shipping;
}
