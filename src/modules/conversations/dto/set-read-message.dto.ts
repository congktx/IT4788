import { ApiProperty } from "@nestjs/swagger";
import { Allow, IsNotEmpty } from "class-validator";

export class SetReadMessageDto {
  @ApiProperty({
    description: "ID người hội thoại cùng",
    example: 1
  })
  @IsNotEmpty({ message: '1002' })
  @Allow()
  partner_id: number;
}