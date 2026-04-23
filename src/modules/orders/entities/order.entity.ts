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
import { Address } from './address.entity';
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

  @Column('decimal', { nullable: true })
  total_price: number;

  @Column('decimal', { nullable: true })
  shipping_fee: number;

  @Column()
  leatime: number;

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

  @ManyToOne(() => Address, (address) => address.orders_as_buyer)
  @JoinColumn({ name: 'buyer_address_id' })
  buyer_address: Address;

  @ManyToOne(() => Address, (address) => address.orders_as_seller)
  @JoinColumn({ name: 'seller_address_id' })
  seller_address: Address;
  @OneToMany(() => Status, (status) => status.order)
  statuses: Status[];
}
