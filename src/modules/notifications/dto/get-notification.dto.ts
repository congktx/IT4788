import { Allow, IsInt, IsNotEmpty, Min } from "class-validator";

export class GetNotiticationDto {
  @Allow()
  @IsNotEmpty({ message: "1002" })
  @IsInt({ message: "1002" })
  @Min(0, { message: "1002" })
  index: number;

  @Allow()
  @IsNotEmpty({ message: "1002" })
  @IsInt({ message: "1002" })
  @Min(1, { message: "1002" })
  count: number;

  @Allow()
  group: number;
}