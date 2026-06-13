import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { User } from '../users/entities/user.entity';
import { RewardProof } from './entities/reward_proof.entity';
import { RewardAppeal } from './entities/reward_appeal.entity';
import { RewardRule } from './entities/reward_rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RewardProof, RewardAppeal, RewardRule])],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService, TypeOrmModule],
})
export class RewardsModule { }