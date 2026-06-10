import { ApiProperty } from "@nestjs/swagger";
import { Allow, IsInt, IsNotEmpty, Min } from "class-validator";

export class GetListConvDto {
  @ApiProperty({
    description: "Số thứ tự trang hội thoại (phân trang)",
    example: 1
  })
  @IsNotEmpty({ message: "1002" })
  @IsInt({ message: "1002" })
  @Min(0, { message: "1002" })
  @Allow()
  index: number;

  @ApiProperty({
    description: "Số hội thoại trong 1 trang",
    example: 10
  })
  @IsNotEmpty({ message: "1002" })
  @IsInt({ message: "1002" })
  @Min(1, { message: "1002" })
  @Allow()
  count: number;
}