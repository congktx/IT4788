import { DataSource, DataSourceOptions } from 'typeorm';
// import { config } from 'dotenv';
// config({ path: '.env.test' });

import { SecretTestConfig } from './src/config/secretTest';
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

export const testDataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: SecretTestConfig.database.host,
  port: SecretTestConfig.database.port,
  username: SecretTestConfig.database.username,
  password: SecretTestConfig.database.password,
  database: SecretTestConfig.database.name, // lấy từ .env.test → myapp_test
  entities: [
    User,
    UserCode,
    Wallet,
    Transaction,
    RewardRule,
    BattleProof,
    Appeal,
    Product,
    Like,
    Comment,
    Report,
    ProductVariant,
    Order,
    OrderItem,
    Shipping,
    Conversation,
    UserConversation,
    Message,
    UserFollow,
    UserBlock,
  ],
  migrations: [],
  synchronize: true,
  dropSchema: true,
};

const testDataSource = new DataSource(testDataSourceOptions);
export default testDataSource;
