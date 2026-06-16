import { Allow, IsInt, IsNotEmpty, IsString } from "class-validator";

export class AddNotiDto {
  @IsString({ message: "1003" })
  @IsNotEmpty({ message: "1004" })
  @Allow()
  type: string;

  @IsInt({ message: "1003" })
  @Allow()
  object_id: number;

  @IsString({ message: "1003" })
  @IsNotEmpty({ message: "1004" })
  @Allow()
  title: string;

  @IsInt({ message: "1003" })
  @Allow()
  user_id: number;
}