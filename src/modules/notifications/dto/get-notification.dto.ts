import { Allow } from "class-validator";

export class GetNotiticationDto {
  @Allow()
  index: number;

  @Allow()
  count: number;

  @Allow()
  group: number;
}