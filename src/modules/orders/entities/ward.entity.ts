import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Province } from './province.entity';
import { Address } from './address.entity';
import { Warehouse } from './warehouse.entity';

@Entity('Wards')
export class Ward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  provinces_id: number;

  @ManyToOne(() => Province, (province) => province.wards)
  @JoinColumn({ name: 'provinces_id' })
  province: Province;

  @OneToMany(() => Address, (address) => address.ward)
  addresses: Address[];

  @OneToMany(() => Warehouse, (warehouse) => warehouse.ward)
  warehouses: Warehouse[];
}
