import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order_item.entity';
import { Shipping } from './shipping.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderTimeline } from './order-timeline.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  buyer_id: number;

  @Column()
  seller_id: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('decimal', { nullable: true, default: 0 })
  total_price: number;

  @Column('decimal', { nullable: true, default: 0 })
  shipping_fee: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'int', nullable: true })
  cancel_reason: number | null;

  @Column({ type: 'text', nullable: true })
  refund_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.orders_bought)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @ManyToOne(() => User, (user) => user.orders_sold)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];

  @OneToOne(() => Shipping, (shipping) => shipping.order)
  shipping: Shipping;

  @OneToMany(() => OrderTimeline, (timeline) => timeline.order)
  timelines: OrderTimeline[];
}