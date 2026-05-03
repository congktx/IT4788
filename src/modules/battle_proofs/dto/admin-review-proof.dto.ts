import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AdminReviewProofDto {
  @IsInt()
  proof_id: number;

  @IsString()
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsNumber()
  approved_coin?: number;

  @IsOptional()
  @IsString()
  admin_note?: string;

  @IsOptional()
  @IsString()
  admin_battle_type?: string;

  @IsOptional()
  @IsNumber()
  admin_evidence_quality?: number;

  @IsOptional()
  @IsBoolean()
  is_duplicate?: boolean;
}
