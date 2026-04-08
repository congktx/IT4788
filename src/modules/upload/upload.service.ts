import { Injectable } from "@nestjs/common";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "src/config/config";
import { v4 as uuidv4 } from 'uuid';
import { SecretConfig } from "src/config/secret";

@Injectable()
export class UploadService {
  constructor() { }

  async uploadFile(file: Express.Multer.File) {
    const key = `files/${uuidv4()}-${file.originalname}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,

        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = SecretConfig.r2.endpoint + `${key}`;

    return {
      url,
    };
  }
}