import { Allow } from 'class-validator';

export class SetUserBlockDto {
  @Allow()
  user_id!: number | string;

  @Allow()
  type!: number | string; // 0 = block, 1 = unblock
}