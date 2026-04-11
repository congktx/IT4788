import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';


@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transaction, User])],
  providers: [WalletsService],
  controllers: [WalletsController],
  exports: [WalletsService],
})
export class WalletsModule {}