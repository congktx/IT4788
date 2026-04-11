import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { SecretConfig } from './src/config/secret';

config();

import { User } from './src/modules/users/entities/user.entity';
import { UserCode } from './src/modules/users/entities/user_code.entity';
import { Wallet } from './src/modules/wallets/entities/wallet.entity';
import { Transaction } from './src/modules/wallets/entities/transaction.entity';
import { RewardRule } from './src/modules/reward_rules/entities/reward_rule.entity';
import { BattleProof } from './src/modules/battle_proofs/entities/battle_proof.entity';
import { Appeal } from './src/modules/battle_proofs/entities/appeal.entity';
import { Product } from './src/modules/products/entities/product.entity';
import { Like } from './src/modules/products/entities/like.entity';
import { Comment } from './src/modules/products/entities/comment.entity';
import { Report } from './src/modules/products/entities/report.entity';
import { ProductVariant } from './src/modules/products/entities/product_variant.entity';
import { Order } from './src/modules/orders/entities/order.entity';
import { OrderItem } from './src/modules/orders/entities/order_item.entity';
import { Shipping } from './src/modules/orders/entities/shipping.entity';
import { Conversation } from './src/modules/conversations/entities/conversation.entity';
import { UserConversation } from './src/modules/conversations/entities/user_conversation.entity';
import { Message } from './src/modules/conversations/entities/message.entity';
import { UserFollow } from './src/modules/follow/entities/user-follow.entity';
import { UserBlock } from './src/modules/blocks/entities/user-block.entity';
import { Address } from './src/modules/addresses/entities/address.entity';
import { OrderTimeline } from './src/modules/orders/entities/order-timeline.entity';

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
    RewardRule,
    BattleProof, Appeal,
    Product, Like, Comment, Report, ProductVariant,
    Order, OrderItem, Shipping, OrderTimeline,
    Conversation, UserConversation, Message,
    UserFollow, UserBlock,
    Address,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: true,
};


const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

