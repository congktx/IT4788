import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { SecretConfig } from '../../config/secret';

@Injectable()
export class UploadService {
  constructor() {
    // Khởi tạo cấu hình Cloudinary từ file secret
    cloudinary.config({
      cloud_name: SecretConfig.cloudinary.cloud_name,
      api_key: SecretConfig.cloudinary.api_key,
      api_secret: SecretConfig.cloudinary.api_secret,
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      // Sử dụng upload_stream để upload trực tiếp buffer từ memory lên Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'army_ecommerce', // Thư mục lưu trên Cloudinary
          resource_type: 'auto', // Tự động nhận dạng ảnh, video, pdf,...
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result?.secure_url || '', // Trả về link https bảo mật của Cloudinary
          });
        },
      );

      // Ghi buffer file vào stream
      uploadStream.end(file.buffer);
    });
  }
}
