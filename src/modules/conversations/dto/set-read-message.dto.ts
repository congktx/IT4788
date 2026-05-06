import { ApiProperty } from "@nestjs/swagger";
import { Allow } from "class-validator";

export class SetReadMessageDto {
  @ApiProperty({
    description: "ID người hội thoại cùng",
    example: 1
  })
  @Allow()
  partner_id: number;
}