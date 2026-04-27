import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { SecretConfig } from './src/config/secret';

config();

import { User } from './src/modules/users/entities/user.entity';
import { UserCode } from './src/modules/users/entities/user_code.entity';
import { Wallet } from './src/modules/wallets/entities/wallet.entity';
import { Transaction } from './src/modules/wallets/entities/transaction.entity';
import { RewardRule } from './src/modules/rewards/entities/reward_rule.entity';
import { RewardProof } from './src/modules/rewards/entities/reward_proof.entity';
import { RewardAppeal } from './src/modules/rewards/entities/reward_appeal.entity';
import { Product } from './src/modules/products/entities/product.entity';
import { Like } from './src/modules/products/entities/like.entity';
import { Comment } from './src/modules/products/entities/comment.entity';
import { Report } from './src/modules/products/entities/report.entity';
import { ProductVariant } from './src/modules/products/entities/product_variant.entity';
import { Order } from './src/modules/orders/entities/order.entity';
import { OrderItem } from './src/modules/orders/entities/order_item.entity';
import { Shipping } from './src/modules/orders/entities/shipping.entity';
import { Conversation } from './src/modules/conversations/entities/conversation.entity';
import { Message } from './src/modules/conversations/entities/message.entity';
import { UserFollow } from './src/modules/follow/entities/user-follow.entity';
import { UserBlock } from './src/modules/blocks/entities/user-block.entity';
import { Notification } from 'src/modules/notifications/entities/notification.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: SecretConfig.database.host,
  port: SecretConfig.database.port,
  username: SecretConfig.database.username,
  password: SecretConfig.database.password,
  database: SecretConfig.database.name,
  entities: [
    User, UserCode,
    Wallet, Transaction,
    RewardProof, RewardAppeal, RewardRule,
    Product, Like, Comment, Report, ProductVariant,
    Order, OrderItem, Shipping,
    Conversation, Message,
    UserFollow, UserBlock,
    Notification
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
};


const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

