import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';
import { Address } from '../../addresses/entities/address.entity';

@Entity('shipping')
export class Shipping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  order_id: number;

  @Column({ type: 'int', nullable: true })
  address_id: number | null;

  @Column({ type: 'int', nullable: true })
  shipper_id: number | null;

  @Column({ type: 'varchar', nullable: true })
  status: string | null;

  @Column({ type: 'varchar', nullable: true })
  tracking_code: string | null;

  @OneToOne(() => Order, (order) => order.shipping)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;
}
