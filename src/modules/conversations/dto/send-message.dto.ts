import { ApiProperty } from "@nestjs/swagger";
import { Allow, IsNotEmpty } from "class-validator";
import { APP_RESPONSE } from "../../constants/response.constants";

export class SendMessageDto {
  @ApiProperty({
    description: "ID người nhận tin nhắn",
    example: 1
  })
  @IsNotEmpty({ message: "1002" })
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
  @IsNotEmpty({ message: "1002" })
  @Allow()
  type_message: string;

  @ApiProperty({
    description: "ID của sản phẩm trong đoạn hội thoại",
    example: 1
  })
  @Allow()
  product_id!: number;
}