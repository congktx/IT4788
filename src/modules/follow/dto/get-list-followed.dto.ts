import { Allow } from 'class-validator';

export class GetListFollowedDto {
  @Allow()
  user_id!: number | string;

  @Allow()
  index!: number | string;

  @Allow()
  count!: number | string;
}