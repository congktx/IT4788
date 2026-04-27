import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { Ward } from './ward.entity';
@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  ward_id: number;

  @Column({ nullable: true })
  address_name: string;

  @Column('text', { nullable: true })
  address_detail: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng: number;

  @Column({ default: false })
  is_default: boolean;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Order, (order) => order.buyer_address)
  orders_as_buyer: Order[];

  @OneToMany(() => Order, (order) => order.seller_address)
  orders_as_seller: Order[];

  @OneToMany(() => Product, (product) => product.ship_from)
  products_shipped_from: Product[];

  @ManyToOne(() => Ward, (ward) => ward.addresses)
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;
}
