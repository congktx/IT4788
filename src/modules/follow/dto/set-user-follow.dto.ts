import { Allow } from 'class-validator';

export class SetUserFollowDto {
  @Allow()
  followee_id!: number | string;

  @Allow()
  action!: string;
}
