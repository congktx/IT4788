import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { RewardProof } from "./entities/reward_proof.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { RewardAppeal } from "./entities/reward_appeal.entity";
import { GetRewardHistoryDto } from "./dto/get-reward-history.dto";
import { APP_RESPONSE } from "../../common/constants/response.constants";

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardProof)
    private readonly rewardProofRepo: Repository<RewardProof>,

    @InjectRepository(RewardAppeal)
    private readonly rewardAppeal: Repository<RewardAppeal>,
  ) { }

  async getRewardHistory(currentUserId: number, getRewardHistoryDto: GetRewardHistoryDto) {
    const skip = (getRewardHistoryDto.index - 1) * getRewardHistoryDto.count;
    let qb = this.rewardProofRepo
      .createQueryBuilder('reward_proof')
      .leftJoinAndSelect('reward_proof.user_id', 'user', 'user.id = :userId', { currentUserId })
      .orderBy('reward_proof.created_at', 'DESC')
      .skip(skip)
      .take(getRewardHistoryDto.count);
    let [proofs, _] = await qb.getManyAndCount();
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: proofs
    }
  }
}