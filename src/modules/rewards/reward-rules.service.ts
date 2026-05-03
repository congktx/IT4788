import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  APP_RESPONSE,
  buildResponse,
} from '../../common/constants/response.constants';
import { RewardRule } from './entities/reward_rule.entity';

type UpsertRewardRuleInput = {
  id?: number;
  battle_type: string;
  label?: string;
  reward_coin: number;
  min_confidence?: number;
  max_reward_coin?: number;
  is_active?: boolean;
};

@Injectable()
export class RewardRulesService {
  constructor(
    @InjectRepository(RewardRule)
    private readonly rewardRuleRepository: Repository<RewardRule>,
  ) {}

  async getList() {
    const rules = await this.rewardRuleRepository.find({
      order: { id: 'ASC' },
    });

    return buildResponse(APP_RESPONSE.OK, rules);
  }

  async getActiveRules() {
    return this.rewardRuleRepository.find({
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  }

  async upsert(dto: UpsertRewardRuleInput) {
    const rule = dto.id
      ? await this.rewardRuleRepository.findOne({ where: { id: dto.id } })
      : this.rewardRuleRepository.create();

    const entity = this.rewardRuleRepository.merge(
      rule ?? this.rewardRuleRepository.create(),
      {
        battle_type: dto.battle_type,
        label: dto.label ?? null,
        reward_coin: dto.reward_coin,
        min_confidence: dto.min_confidence ?? 0.6,
        max_reward_coin: dto.max_reward_coin ?? dto.reward_coin,
        is_active: dto.is_active ?? true,
      },
    );

    const saved = await this.rewardRuleRepository.save(entity);
    return buildResponse(APP_RESPONSE.OK, saved);
  }

  async seedDefaults() {
    const defaults: UpsertRewardRuleInput[] = [
      {
        battle_type: 'armored_vehicle',
        label: 'Armored vehicle',
        reward_coin: 500,
        min_confidence: 0.6,
        max_reward_coin: 500,
      },
      {
        battle_type: 'uav',
        label: 'UAV',
        reward_coin: 250,
        min_confidence: 0.6,
        max_reward_coin: 250,
      },
      {
        battle_type: 'radar',
        label: 'Radar',
        reward_coin: 400,
        min_confidence: 0.6,
        max_reward_coin: 400,
      },
      {
        battle_type: 'logistics',
        label: 'Logistics',
        reward_coin: 180,
        min_confidence: 0.6,
        max_reward_coin: 180,
      },
      {
        battle_type: 'vehicle',
        label: 'Vehicle',
        reward_coin: 160,
        min_confidence: 0.6,
        max_reward_coin: 160,
      },
      {
        battle_type: 'unknown',
        label: 'Unknown',
        reward_coin: 50,
        min_confidence: 0.8,
        max_reward_coin: 50,
      },
    ];

    const saved: RewardRule[] = [];

    for (const item of defaults) {
      const existed = await this.rewardRuleRepository.findOne({
        where: { battle_type: item.battle_type },
      });

      const entity = this.rewardRuleRepository.merge(
        existed ?? this.rewardRuleRepository.create(),
        {
          ...item,
          is_active: true,
        },
      );

      saved.push(await this.rewardRuleRepository.save(entity));
    }

    return buildResponse(APP_RESPONSE.OK, saved);
  }
}
