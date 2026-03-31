import { Allow } from 'class-validator';

export class GetListBlocksDto {
  @Allow()
  index!: number | string;

  @Allow()
  count!: number | string;
}