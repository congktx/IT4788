import { ApiProperty } from "@nestjs/swagger";
import { Allow, IsString, Matches } from "class-validator";

export class AddRewardProofDto {
  @Allow()
  image_url!: string;

  @Allow()
  video_url!: string;

  @ApiProperty({
    description: "mô tả về chiến công, chú ý cả về số lượng đối tượng",
    example: "1 người lính bị thương"
  })
  @Allow()
  @IsString({ message: "1003" })
  @Matches(/\S/, { message: "1004" })
  description: string;
}