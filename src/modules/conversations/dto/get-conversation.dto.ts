import { ApiProperty } from "@nestjs/swagger";
import { Allow, IsInt, IsNotEmpty, Min } from "class-validator";

export class GetConvDto {
  @ApiProperty({
    description: "ID người nhận tin nhắn",
    example: 0
  })
  @Allow()
  partner_id!: number;

  @ApiProperty({
    description: "ID đoạn hội thoại",
    example: 0
  })
  @Allow()
  conversation_id!: number;

  @ApiProperty({
    description: "Số thứ tự trang tin nhắn tải về (phân trang)",
    example: 1
  })
  @IsNotEmpty({ message: "1002" })
  @IsInt({ message: "1003" })
  @Min(0, { message: "1004" })
  @Allow()
  index: number;

  @ApiProperty({
    description: "Số lượng tin nhắn trong một trang",
    example: 10
  })
  @IsNotEmpty({ message: "1002" })
  @IsInt({ message: "1003" })
  @Min(1, { message: "1004" })
  @Allow()
  count: number;
}