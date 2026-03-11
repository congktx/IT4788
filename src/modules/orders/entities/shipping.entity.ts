import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

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

  @OneToOne(() => Order, order => order.shipping)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
