import { ApiProperty } from "@nestjs/swagger";
import { Allow } from "class-validator";

export class GetListConvDto {
  @ApiProperty({
    description: "Số thứ tự trang hội thoại (phân trang)",
    example: 1
  })
  @Allow()
  index: number;

  @ApiProperty({
    description: "Số hội thoại trong 1 trang",
    example: 10
  })
  @Allow()
  count: number;
}