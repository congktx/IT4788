import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';
import { Address } from './address.entity';
@Entity('shipping')
export class Shipping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  order_id: number;

  @Column({ nullable: true })
  address_id: number;

  @Column({ nullable: true })
  shipper_id: number;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  tracking_code: string;

  @OneToOne(() => Order, (order) => order.shipping)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;
}
