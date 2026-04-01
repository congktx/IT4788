import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('Status')
export class Status {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  status_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  status_detail: string;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'create_at',
  })
  create_at: Date;

  @Column()
  order_id: number;

  @ManyToOne(() => Order, (order) => order.statuses)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
