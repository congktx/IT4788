import { Allow } from "class-validator";

export class GetListConvDto {
  @Allow()
  index: number;

  @Allow()
  count: number;
}