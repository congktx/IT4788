import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { User } from "../users/entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService, TypeOrmModule],
})
export class UploadModule { }