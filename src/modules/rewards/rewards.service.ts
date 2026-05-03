import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { RewardProof } from "./entities/reward_proof.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { RewardAppeal } from "./entities/reward_appeal.entity";
import { GetRewardHistoryDto } from "./dto/get-reward-history.dto";
import { APP_RESPONSE } from "../../common/constants/response.constants";
import { CreateRewardAppealDto } from "./dto/create-reward-appeal.dto";

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardProof)
    private readonly rewardProofRepo: Repository<RewardProof>,

    @InjectRepository(RewardAppeal)
    private readonly rewardAppealRepo: Repository<RewardAppeal>,
  ) { }

  async getRewardHistory(currentUserId: number, getRewardHistoryDto: GetRewardHistoryDto) {
    const skip = (getRewardHistoryDto.index - 1) * getRewardHistoryDto.count;
    let [proofs, _] = await this.rewardProofRepo.findAndCount({
      where: {
        user: { id: currentUserId }
      },
      relations: ["user", "appeals"],
      order: {
        created_at: "DESC"
      },
      skip: skip,
      take: getRewardHistoryDto.count
    });
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: proofs
    }
  }

  async createRewardAppeal(currentUserId: number, body: CreateRewardAppealDto) {
    let reward = await this.rewardProofRepo.findOne({ where: { id: body.reward_id } });
    if (!reward) {
      return {
        ...APP_RESPONSE.PARAMETER_VALUE_INVALID,
        data: null
      }
    }
    let appeal = await this.rewardAppealRepo.create({
      reason: body.reason,
      status: "pending",
      proof: { id: reward.id },
      user: { id: currentUserId },
    });
    return {
      ...APP_RESPONSE.OK,
      data: await this.rewardAppealRepo.save(appeal)
    }
  }
}