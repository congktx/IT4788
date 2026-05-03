import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { APP_RESPONSE, buildResponse } from '../constants/response.constants';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { RewardRulesService } from '../rewards/reward-rules.service';
import { BattleProof } from './entities/battle_proof.entity';
import { Appeal } from './entities/appeal.entity';
import { SubmitBattleProofDto } from './dto/submit-battle-proof.dto';
import { GetListBattleProofsDto } from './dto/get-list-battle-proofs.dto';
import { GetBattleProofDetailDto } from './dto/get-battle-proof-detail.dto';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { AdminReviewProofDto } from './dto/admin-review-proof.dto';
import { UpsertRewardRuleDto } from './dto/upsert-reward-rule.dto';
import { ExportAiDatasetDto } from './dto/export-ai-dataset.dto';

type AiResult = {
  battle_type: string;
  ai_score: number;
  evidence_quality: number;
  duplicate_risk: number;
  reward_coin: number;
  ai_reason: string;
};

@Injectable()
export class BattleProofsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(BattleProof)
    private readonly battleProofRepository: Repository<BattleProof>,

    @InjectRepository(Appeal)
    private readonly appealRepository: Repository<Appeal>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly rewardRulesService: RewardRulesService,
  ) {}

  async submitProof(dto: SubmitBattleProofDto, userId: number) {
    const user = await this.getUserOrThrow(userId);

    if (!dto.video_url && !dto.image_url && !dto.description) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH),
      );
    }

    const aiResult = await this.mockAnalyze(dto);
    const shouldAutoCredit =
      aiResult.ai_score >= 0.6 && aiResult.duplicate_risk < 0.75;

    const savedProof = await this.dataSource.transaction(async (manager) => {
      const proof = manager.create(BattleProof, {
        user_id: user.id,
        video_url: dto.video_url ?? null,
        image_url: dto.image_url ?? null,
        description: dto.description ?? null,
        ai_score: aiResult.ai_score,
        reward_coin: aiResult.reward_coin,
        battle_type: aiResult.battle_type,
        evidence_quality: aiResult.evidence_quality,
        duplicate_risk: aiResult.duplicate_risk,
        ai_reason: aiResult.ai_reason,
        model_version: 'mock-keyword-v1',
        ai_raw_output: JSON.stringify(aiResult),
        is_duplicate: aiResult.duplicate_risk >= 0.75,
        approved_coin: shouldAutoCredit ? aiResult.reward_coin : 0,
        status: shouldAutoCredit ? 'ai_approved' : 'pending_review',
      });

      const saved = await manager.save(BattleProof, proof);

      if (shouldAutoCredit && aiResult.reward_coin > 0) {
        await this.applyCoinDelta(
          manager,
          user.id,
          aiResult.reward_coin,
          `AI reward for battle proof #${saved.id}`,
        );
      }

      return saved;
    });

    return buildResponse(APP_RESPONSE.OK, savedProof);
  }

  async getMyProofs(dto: GetListBattleProofsDto, userId: number) {
    await this.getUserOrThrow(userId);

    const index = this.parsePaginationNumber(dto.index);
    const count = this.parsePaginationNumber(dto.count, false);

    const [items, total] = await this.battleProofRepository.findAndCount({
      where: {
        user_id: userId,
        ...(dto.status ? { status: dto.status } : {}),
      },
      relations: ['appeals'],
      order: { created_at: 'DESC' },
      skip: index,
      take: count,
    });

    return buildResponse(APP_RESPONSE.OK, { items, total });
  }

  async getDetail(dto: GetBattleProofDetailDto, userId: number) {
    const user = await this.getUserOrThrow(userId);
    const proof = await this.battleProofRepository.findOne({
      where: { id: dto.proof_id },
      relations: ['appeals', 'user'],
    });

    if (!proof) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (proof.user_id !== user.id && !this.isAdmin(user)) {
      throw new ForbiddenException(buildResponse(APP_RESPONSE.NOT_ACCESS));
    }

    return buildResponse(APP_RESPONSE.OK, proof);
  }

  async createAppeal(dto: CreateAppealDto, userId: number) {
    await this.getUserOrThrow(userId);

    const proof = await this.battleProofRepository.findOne({
      where: { id: dto.proof_id, user_id: userId },
    });

    if (!proof) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (
      proof.status === 'admin_approved' ||
      proof.status === 'admin_rejected'
    ) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.ACTION_DONE_PREVIOUSLY),
      );
    }

    const existedAppeal = await this.appealRepository.findOne({
      where: { proof_id: proof.id, user_id: userId, status: 'pending' },
    });

    if (existedAppeal) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.ACTION_DONE_PREVIOUSLY),
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      proof.status = 'appealed';
      await manager.save(BattleProof, proof);

      const appeal = manager.create(Appeal, {
        proof_id: proof.id,
        user_id: userId,
        reason: dto.reason,
        requested_coin: dto.requested_coin ?? null,
        status: 'pending',
      });

      return manager.save(Appeal, appeal);
    });

    return buildResponse(APP_RESPONSE.OK, saved);
  }

  async getAdminProofs(dto: GetListBattleProofsDto, adminId: number) {
    const admin = await this.getUserOrThrow(adminId);
    this.assertAdmin(admin);

    const index = this.parsePaginationNumber(dto.index);
    const count = this.parsePaginationNumber(dto.count, false);

    const [items, total] = await this.battleProofRepository.findAndCount({
      where: dto.status ? { status: dto.status } : {},
      relations: ['appeals', 'user'],
      order: { created_at: 'DESC' },
      skip: index,
      take: count,
    });

    return buildResponse(APP_RESPONSE.OK, { items, total });
  }

  async reviewProof(dto: AdminReviewProofDto, adminId: number) {
    const admin = await this.getUserOrThrow(adminId);
    this.assertAdmin(admin);

    if (dto.decision !== 'approved' && dto.decision !== 'rejected') {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const proof = await this.battleProofRepository.findOne({
      where: { id: dto.proof_id },
    });

    if (!proof) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const approvedCoin =
      dto.decision === 'approved'
        ? Number(dto.approved_coin ?? proof.reward_coin ?? 0)
        : 0;

    if (approvedCoin < 0) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const oldApprovedCoin = Number(proof.approved_coin || 0);
      const delta = approvedCoin - oldApprovedCoin;

      proof.approved_coin = approvedCoin;
      proof.status =
        dto.decision === 'approved' ? 'admin_approved' : 'admin_rejected';
      proof.reviewed_by = admin.id;
      proof.reviewed_at = new Date();
      proof.admin_note = dto.admin_note ?? null;
      proof.admin_battle_type = dto.admin_battle_type ?? proof.battle_type;
      proof.admin_evidence_quality =
        dto.admin_evidence_quality ?? proof.evidence_quality;
      proof.is_duplicate = dto.is_duplicate ?? proof.is_duplicate ?? false;

      const updatedProof = await manager.save(BattleProof, proof);

      if (delta !== 0) {
        await this.applyCoinDelta(
          manager,
          proof.user_id,
          delta,
          `Admin review for battle proof #${proof.id}`,
        );
      }

      await manager.update(
        Appeal,
        { proof_id: proof.id, status: 'pending' },
        {
          status: dto.decision === 'approved' ? 'approved' : 'rejected',
          admin_note: dto.admin_note ?? null,
        },
      );

      return updatedProof;
    });

    return buildResponse(APP_RESPONSE.OK, saved);
  }

  async getRewardRules(adminId: number) {
    const admin = await this.getUserOrThrow(adminId);
    this.assertAdmin(admin);

    return this.rewardRulesService.getList();
  }

  async upsertRewardRule(dto: UpsertRewardRuleDto, adminId: number) {
    const admin = await this.getUserOrThrow(adminId);
    this.assertAdmin(admin);

    return this.rewardRulesService.upsert(dto);
  }

  async seedDefaultRewardRules(adminId: number) {
    const admin = await this.getUserOrThrow(adminId);
    this.assertAdmin(admin);

    return this.rewardRulesService.seedDefaults();
  }

  async previewAiAnalyze(dto: SubmitBattleProofDto, userId: number) {
    await this.getUserOrThrow(userId);

    if (!dto.video_url && !dto.image_url && !dto.description) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH),
      );
    }

    const aiResult = await this.mockAnalyze(dto);

    return buildResponse(APP_RESPONSE.OK, {
      ...aiResult,
      model_version: 'mock-keyword-v1',
      auto_credit:
        aiResult.ai_score >= 0.6 &&
        aiResult.duplicate_risk < 0.75 &&
        aiResult.reward_coin > 0,
    });
  }

  async exportAiDataset(dto: ExportAiDatasetDto, adminId: number) {
    const admin = await this.getUserOrThrow(adminId);
    this.assertAdmin(admin);

    const rows = await this.battleProofRepository.find({
      where: dto.status ? { status: dto.status } : {},
      order: { created_at: 'ASC' },
    });

    const dataset = rows.map((proof) => ({
      proof_id: proof.id,
      description: proof.description ?? '',
      image_url: proof.image_url ?? '',
      video_url: proof.video_url ?? '',
      ai_battle_type: proof.battle_type ?? 'unknown',
      label_battle_type:
        proof.admin_battle_type ?? proof.battle_type ?? 'unknown',
      ai_score: Number(proof.ai_score ?? 0),
      evidence_quality: Number(
        proof.admin_evidence_quality ?? proof.evidence_quality ?? 0,
      ),
      duplicate_risk: Number(proof.duplicate_risk ?? 0),
      is_duplicate: Boolean(proof.is_duplicate),
      predicted_coin: Number(proof.reward_coin ?? 0),
      label_coin: Number(proof.approved_coin ?? proof.reward_coin ?? 0),
      status: proof.status ?? '',
      model_version: proof.model_version ?? '',
      created_at: proof.created_at,
    }));

    if (dto.format === 'csv') {
      return buildResponse(APP_RESPONSE.OK, {
        filename: 'battle-proof-ai-dataset.csv',
        content: this.toCsv(dataset),
      });
    }

    return buildResponse(APP_RESPONSE.OK, {
      items: dataset,
      total: dataset.length,
    });
  }

  private async mockAnalyze(dto: SubmitBattleProofDto): Promise<AiResult> {
    const text = `${dto.description ?? ''} ${dto.image_url ?? ''} ${
      dto.video_url ?? ''
    }`.toLowerCase();
    const rules = await this.rewardRulesService.getActiveRules();

    const battleType = this.detectBattleType(text);
    const rule = rules.find((item) => item.battle_type === battleType);
    const baseReward = Number(
      rule?.reward_coin ?? this.defaultReward(battleType),
    );
    const maxReward = Number(rule?.max_reward_coin ?? baseReward);
    const minConfidence = Number(rule?.min_confidence ?? 0.6);
    const evidenceQuality = this.estimateEvidenceQuality(dto);
    const duplicateRisk = await this.estimateDuplicateRisk(dto);
    const keywordConfidence = battleType === 'unknown' ? 0.45 : 0.72;
    const aiScore = Number(
      Math.max(
        0,
        Math.min(0.98, keywordConfidence * 0.7 + evidenceQuality * 0.3),
      ).toFixed(2),
    );
    const confidenceFactor = aiScore >= minConfidence ? aiScore : 0;
    const rewardCoin = Number(
      Math.min(
        maxReward,
        baseReward * confidenceFactor * (1 - duplicateRisk),
      ).toFixed(2),
    );

    return {
      battle_type: battleType,
      ai_score: aiScore,
      evidence_quality: evidenceQuality,
      duplicate_risk: duplicateRisk,
      reward_coin: rewardCoin,
      ai_reason: `Mock AI classified as ${battleType}; confidence=${aiScore}; evidence_quality=${evidenceQuality}; duplicate_risk=${duplicateRisk}.`,
    };
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';

    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      const text =
        value instanceof Date ? value.toISOString() : String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };

    return [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((header) => escape(row[header])).join(','),
      ),
    ].join('\n');
  }

  private detectBattleType(text: string): string {
    if (/(tank|xe tang|thiết giáp|thiet giap|armored)/i.test(text)) {
      return 'armored_vehicle';
    }
    if (
      /(uav|drone|flycam|máy bay không người lái|may bay khong nguoi lai)/i.test(
        text,
      )
    ) {
      return 'uav';
    }
    if (/(radar|anten|trạm thông tin|tram thong tin)/i.test(text)) {
      return 'radar';
    }
    if (/(kho|đạn|dan|supply|logistic|hậu cần|hau can)/i.test(text)) {
      return 'logistics';
    }
    if (/(vehicle|truck|xe tải|xe tai|phương tiện|phuong tien)/i.test(text)) {
      return 'vehicle';
    }
    return 'unknown';
  }

  private defaultReward(battleType: string): number {
    const rewards: Record<string, number> = {
      armored_vehicle: 500,
      uav: 250,
      radar: 400,
      logistics: 180,
      vehicle: 160,
      unknown: 50,
    };

    return rewards[battleType] ?? rewards.unknown;
  }

  private estimateEvidenceQuality(dto: SubmitBattleProofDto): number {
    let quality = 0.35;

    if (dto.image_url) quality += 0.2;
    if (dto.video_url) quality += 0.3;
    if ((dto.description ?? '').length >= 20) quality += 0.15;

    return Number(Math.min(0.95, quality).toFixed(2));
  }

  private async estimateDuplicateRisk(
    dto: SubmitBattleProofDto,
  ): Promise<number> {
    if (!dto.image_url && !dto.video_url) return 0.15;

    const existed = await this.battleProofRepository.findOne({
      where: [
        ...(dto.image_url ? [{ image_url: dto.image_url }] : []),
        ...(dto.video_url ? [{ video_url: dto.video_url }] : []),
      ],
    });

    return existed ? 0.9 : 0.1;
  }

  private async getUserOrThrow(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException(
        buildResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    return user;
  }

  private assertAdmin(user: User) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException(buildResponse(APP_RESPONSE.NOT_ACCESS));
    }
  }

  private isAdmin(user: User): boolean {
    const role = (user.role ?? '').toLowerCase();
    return role === 'admin' || role === 'officer' || role === 'super_admin';
  }

  private parsePaginationNumber(value: string, allowZero = true): number {
    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      (!allowZero && parsed <= 0)
    ) {
      throw new BadRequestException(
        buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    return parsed;
  }

  private async applyCoinDelta(
    manager: EntityManager,
    userId: number,
    amount: number,
    description: string,
  ) {
    let wallet = await manager.findOne(Wallet, { where: { user_id: userId } });

    if (!wallet) {
      wallet = manager.create(Wallet, {
        user_id: userId,
        balance: 0,
        pending_balance: 0,
      });
      wallet = await manager.save(Wallet, wallet);
    }

    wallet.balance = Number(wallet.balance || 0) + amount;
    await manager.save(Wallet, wallet);

    const transaction = manager.create(Transaction, {
      wallet_id: wallet.id,
      type: amount >= 0 ? 'income' : 'expense',
      amount: Math.abs(amount),
      status: 'success',
      description,
    });

    await manager.save(Transaction, transaction);
  }
}
