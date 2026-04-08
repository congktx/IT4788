import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { UploadService } from "./upload.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { APP_RESPONSE } from "src/common/constants/response.constants";
import { AuthGuard } from "src/common/auth/guards/auth.guard";
import type { AuthenticatedRequest } from "src/types/auth.type";

@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post("file")
  // @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File
  ) {
    const data = this.uploadService.uploadFile(file);
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: data
    }
  }
}