import { ApiProperty } from "@nestjs/swagger";
import { Allow } from "class-validator";

export class SendMessageDto {
  @ApiProperty({
    description: "ID người nhận tin nhắn",
    example: 1
  })
  @Allow()
  to_id: number;

  @ApiProperty({
    description: "Nội dung tin nhắn",
    example: "hello bae"
  })
  @Allow()
  message: string;

  @ApiProperty({
    description: "Kiểu tin nhắn",
    example: "text, image, video, file"
  })
  @Allow()
  type_message: string;

  @ApiProperty({
    description: "ID của sản phẩm trong đoạn hội thoại",
    example: 1
  })
  @Allow()
  product_id!: number;
}