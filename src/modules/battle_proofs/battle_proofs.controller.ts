import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { BattleProofsService } from './battle_proofs.service';
import { SubmitBattleProofDto } from './dto/submit-battle-proof.dto';
import { GetListBattleProofsDto } from './dto/get-list-battle-proofs.dto';
import { GetBattleProofDetailDto } from './dto/get-battle-proof-detail.dto';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { AdminReviewProofDto } from './dto/admin-review-proof.dto';
import { UpsertRewardRuleDto } from './dto/upsert-reward-rule.dto';
import { ExportAiDatasetDto } from './dto/export-ai-dataset.dto';

interface RequestWithUser extends Request {
  user?: {
    id?: number;
    userId?: number;
  };
}

@Controller('battle-proof')
export class BattleProofsController {
  constructor(private readonly battleProofsService: BattleProofsService) {}

  private getUserId(req: RequestWithUser): number {
    return req.user?.id ?? req.user?.userId ?? 0;
  }

  @UseGuards(AuthGuard)
  @Post('submit')
  submitProof(@Body() body: SubmitBattleProofDto, @Req() req: RequestWithUser) {
    return this.battleProofsService.submitProof(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('get_list')
  getMyProofs(
    @Body() body: GetListBattleProofsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.battleProofsService.getMyProofs(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('get_detail')
  getDetail(
    @Body() body: GetBattleProofDetailDto,
    @Req() req: RequestWithUser,
  ) {
    return this.battleProofsService.getDetail(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('appeal')
  createAppeal(@Body() body: CreateAppealDto, @Req() req: RequestWithUser) {
    return this.battleProofsService.createAppeal(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('admin/get_list')
  getAdminProofs(
    @Body() body: GetListBattleProofsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.battleProofsService.getAdminProofs(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('admin/review')
  reviewProof(@Body() body: AdminReviewProofDto, @Req() req: RequestWithUser) {
    return this.battleProofsService.reviewProof(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('reward-rules/get_list')
  getRewardRules(@Req() req: RequestWithUser) {
    return this.battleProofsService.getRewardRules(this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('reward-rules/upsert')
  upsertRewardRule(
    @Body() body: UpsertRewardRuleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.battleProofsService.upsertRewardRule(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('reward-rules/seed_default')
  seedDefaultRewardRules(@Req() req: RequestWithUser) {
    return this.battleProofsService.seedDefaultRewardRules(this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('ai/preview')
  previewAiAnalyze(
    @Body() body: SubmitBattleProofDto,
    @Req() req: RequestWithUser,
  ) {
    return this.battleProofsService.previewAiAnalyze(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('ai/export_dataset')
  exportAiDataset(
    @Body() body: ExportAiDatasetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.battleProofsService.exportAiDataset(body, this.getUserId(req));
  }
}
