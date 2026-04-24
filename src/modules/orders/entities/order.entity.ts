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
import { Address } from '../../addresses/entities/address.entity';
import { Status } from './status_order.entities';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  buyer_id: number;

  @Column({ nullable: true })
  buyer_address_id: number;

  @Column()
  seller_id: number;

  @Column({ nullable: true })
  seller_address_id: number;

  @Column({ nullable: true })
  status_id: number;

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

  @Column({ type: 'int', nullable: true })
  leatime: number | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

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

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'buyer_address_id' })
  buyer_address: Address;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'seller_address_id' })
  seller_address: Address;

  @OneToMany(() => Status, (status) => status.order)
  statuses: Status[];
}