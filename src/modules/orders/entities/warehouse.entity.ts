import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ward } from './ward.entity';

@Entity('Warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouse_name: string;

  @Column()
  ward_id: number;

  @Column({ type: 'text', nullable: true })
  address_detail: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng: number;

  @Column({ default: false })
  pick_support: boolean;

  @ManyToOne(() => Ward, (ward) => ward.warehouses)
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;
}
