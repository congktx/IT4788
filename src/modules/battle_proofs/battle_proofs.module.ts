import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsModule } from '../rewards/rewards.module';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { BattleProofsController } from './battle_proofs.controller';
import { BattleProofsService } from './battle_proofs.service';
import { BattleProof } from './entities/battle_proof.entity';
import { Appeal } from './entities/appeal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BattleProof, Appeal, User, Wallet, Transaction]),
    RewardsModule,
  ],
  controllers: [BattleProofsController],
  providers: [BattleProofsService],
  exports: [BattleProofsService],
})
export class BattleProofsModule {}
