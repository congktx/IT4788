import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { UploadService } from "./upload.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { APP_RESPONSE } from "../../common/constants/response.constants";
import { AuthGuard } from "../../common/auth/guards/auth.guard";
import type { AuthenticatedRequest } from "../../types/auth.type";
import 'multer'
import { ApiBearerAuth } from "@nestjs/swagger";

@ApiBearerAuth("JWT-auth")
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post("file")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File
  ) {
    const data = await this.uploadService.uploadFile(file);
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: data
    }
  }
}